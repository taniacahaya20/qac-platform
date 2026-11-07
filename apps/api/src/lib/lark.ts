export interface LarkAlertPayload {
  webhookUrl: string
  projectName: string
  runName: string
  caseCode: string
  caseTitle: string
  actor?: string | null
  condition?: string | null
  status: 'FAILED' | 'BLOCKED'
  comment?: string | null
  defects?: string | null
  priority?: string | null
  testerName: string
  runUrl?: string
}

export async function sendLarkNotification(payload: LarkAlertPayload): Promise<{ success: boolean; error?: string }> {
  if (!payload.webhookUrl || !payload.webhookUrl.startsWith('http')) {
    return { success: false, error: 'URL Webhook Lark tidak valid atau belum diisi' }
  }

  const isFailed = payload.status === 'FAILED'
  const headerColor = isFailed ? 'red' : 'orange'
  const statusEmoji = isFailed ? '🔴 FAILED' : '⛔ BLOCKED'

  const body = {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: `${isFailed ? '🔴' : '⛔'} [QAC Alert] Kasus Uji ${payload.status}: ${payload.caseCode}`,
        },
        template: headerColor,
      },
      elements: [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: { tag: 'lark_md', content: `**Proyek:**\n${payload.projectName}` },
            },
            {
              is_short: true,
              text: { tag: 'lark_md', content: `**Test Run:**\n${payload.runName}` },
            },
            {
              is_short: true,
              text: { tag: 'lark_md', content: `**Status:**\n${statusEmoji}` },
            },
            {
              is_short: true,
              text: { tag: 'lark_md', content: `**Tester:**\n${payload.testerName}` },
            },
          ],
        },
        {
          tag: 'hr',
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**Kasus Uji:** [${payload.caseCode}] ${payload.caseTitle}\n**Actor:** ${payload.actor || 'Superadmin'} | **Condition:** ${payload.condition || 'Positif Case'}${payload.priority ? ` | **Prioritas:** ${payload.priority}` : ''}${payload.defects ? `\n**Defect ID:** \`${payload.defects}\`` : ''}`,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**Catatan / Laporan QA:**\n${payload.comment || 'Pengujian tidak berhasil atau terhambat (blocked).'}` ,
          },
        },
        ...(payload.runUrl
          ? [
              {
                tag: 'action',
                actions: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: 'Buka Test Run di QAC Platform' },
                    type: 'primary',
                    url: payload.runUrl,
                  },
                ],
              },
            ]
          : []),
      ],
    },
  }

  try {
    const res = await fetch(payload.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok || (data.code && data.code !== 0)) {
      return { success: false, error: data.msg || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghubungi server Lark' }
  }
}

export interface LarkTaskTicketPayload {
  appId: string
  appSecret: string
  tasklistGuid?: string | null
  projectName: string
  issueCode: string
  caseCode: string
  caseTitle: string
  condition?: string | null
  actor?: string | null
  priority?: string | null
  severity?: string | null
  status: 'FAILED' | 'BLOCKED'
  comment?: string | null
  testerName: string
  runUrl?: string
}

export async function createLarkTaskTicket(
  payload: LarkTaskTicketPayload
): Promise<{ success: boolean; taskGuid?: string; taskUrl?: string; tasklistGuid?: string; error?: string }> {
  if (!payload.appId || !payload.appSecret) {
    return { success: false, error: 'App ID atau App Secret Lark belum diisi' }
  }

  try {
    // 1. Get tenant_access_token
    const tokenRes = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: payload.appId, app_secret: payload.appSecret }),
    })
    const tokenData: any = await tokenRes.json().catch(() => ({}))
    if (!tokenData?.tenant_access_token) {
      return { success: false, error: tokenData?.msg || 'Gagal autentikasi ke Lark Open API' }
    }
    const token = tokenData.tenant_access_token

    // 2. Ensure tasklist exists
    let tasklistGuid = payload.tasklistGuid
    if (!tasklistGuid) {
      const tasklistName = `QAC Issue Tickets (${payload.projectName})`
      const createTlRes = await fetch('https://open.larksuite.com/open-apis/task/v2/tasklists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ name: tasklistName }),
      })
      const createTlData: any = await createTlRes.json().catch(() => ({}))
      if (createTlData?.data?.tasklist?.guid) {
        tasklistGuid = createTlData.data.tasklist.guid
      }
    }

    // 3. Try to query / create sections (Todo, In Progress, In Review, Done)
    let todoSectionGuid: string | undefined = undefined
    if (tasklistGuid) {
      try {
        const secRes = await fetch(
          `https://open.larksuite.com/open-apis/task/v2/sections?resource_type=tasklist&resource_id=${tasklistGuid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        const secData: any = await secRes.json().catch(() => ({}))
        const existingSections: any[] = secData?.data?.items ?? []
        const secMap: Record<string, string> = {}
        for (const s of existingSections) {
          secMap[s.name] = s.guid
        }

        const desired = ['Todo', 'In Progress', 'In Review', 'Done']
        for (const name of desired) {
          if (!secMap[name]) {
            const addSecRes = await fetch('https://open.larksuite.com/open-apis/task/v2/sections', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json; charset=utf-8',
              },
              body: JSON.stringify({
                name,
                resource_type: 'tasklist',
                resource_id: tasklistGuid,
              }),
            })
            const addSecData: any = await addSecRes.json().catch(() => ({}))
            if (addSecData?.data?.section?.guid) {
              secMap[name] = addSecData.data.section.guid
            }
          }
        }
        todoSectionGuid = secMap['Todo']
      } catch (secErr) {
        // Sections require task:section scope; gracefully continue if not permitted
      }
    }

    // 4. Create the Task in Lark Task v2
    const summary = `[${payload.issueCode}] [${payload.status}] ${payload.caseCode}: ${payload.caseTitle}`
    const description = [
      `📌 Status Tiket: Todo (Default)`,
      `🎯 Kasus Uji: [${payload.caseCode}] ${payload.caseTitle}`,
      `👤 Actor: ${payload.actor || 'Superadmin'}`,
      `🔍 Kondisi: ${payload.condition || 'Positif Case'}`,
      `⚡ Prioritas: ${payload.priority || 'High'} | Severity: ${payload.severity || 'Major'}`,
      `👨‍💻 Dilaporkan oleh Tester: ${payload.testerName}`,
      ``,
      `📝 Catatan Temuan Bug:`,
      payload.comment || 'Hasil pengujian gagal / terblokir saat eksekusi test run.',
      ``,
      payload.runUrl ? `🔗 Buka Test Run di QAC:\n${payload.runUrl}` : '',
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n')

    const taskPayload: any = {
      summary,
      description,
    }

    if (tasklistGuid) {
      taskPayload.tasklists = [
        {
          tasklist_guid: tasklistGuid,
          ...(todoSectionGuid ? { section_guid: todoSectionGuid } : {}),
        },
      ]
    }

    const createTaskRes = await fetch('https://open.larksuite.com/open-apis/task/v2/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(taskPayload),
    })
    const createTaskData: any = await createTaskRes.json().catch(() => ({}))

    if (createTaskData?.code !== 0 && createTaskData?.code !== undefined) {
      return {
        success: false,
        error: createTaskData?.msg || 'Gagal membuat task di Lark',
        tasklistGuid: tasklistGuid || undefined,
      }
    }

    const task = createTaskData?.data?.task
    return {
      success: true,
      taskGuid: task?.guid,
      taskUrl: task?.url,
      tasklistGuid: tasklistGuid || undefined,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghubungi Lark Task API' }
  }
}
