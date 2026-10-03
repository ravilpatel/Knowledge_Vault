import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#e67e22', Transport: '#3498db', Investment: '#27ae60',
  Health: '#e74c3c', Entertainment: '#9b59b6', Shopping: '#f39c12',
  Utilities: '#7f8c8d', Education: '#1abc9c', Reimbursable: '#2ecc71', Other: '#95a5a6',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch user settings
    const { data: settings, error: settingsErr } = await sb
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!settings) throw new Error('User settings not found. Please configure SMTP in Settings.')
    if (!settings.smtp_host) throw new Error('SMTP not configured. Please set up email in Settings.')

    // Calculate previous month range
    const now = new Date()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const monthName = prevMonthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    const startDate = prevMonthStart.toISOString().split('T')[0]
    const endDate = prevMonthEnd.toISOString().split('T')[0]

    // Fetch expenses for previous month
    const { data: expenses, error: expErr } = await sb
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (expErr) throw expErr

    const allExpenses = expenses || []
    const totalAmount = allExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
    const reimbursableAmount = allExpenses
      .filter((e: any) => e.reimbursable)
      .reduce((s: number, e: any) => s + Number(e.amount), 0)
    const netAmount = totalAmount - reimbursableAmount

    // Group by category
    const byCategory: Record<string, number> = {}
    allExpenses.forEach((e: any) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)
    })

    // Generate HTML email
    const categoryRows = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${CATEGORY_COLORS[cat] || '#95a5a6'};margin-right:6px;"></span>
            ${cat}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">
            ₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#888;font-size:12px;">
            ${((Number(amt) / totalAmount) * 100).toFixed(1)}%
          </td>
        </tr>`).join('')

    const reimbursableRows = allExpenses
      .filter((e: any) => e.reimbursable)
      .map((e: any) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${e.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${e.description}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${e.reimbursable_note || ''}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">₹${Number(e.amount).toLocaleString('en-IN')}</td>
        </tr>`).join('')

    const htmlEmail = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f5f4;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:#0075de;padding:32px 32px 24px;color:#fff;">
      <div style="font-size:12px;opacity:0.8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Knowledge Vault</div>
      <h1 style="margin:0;font-size:28px;font-weight:700;">Finance Report</h1>
      <div style="margin-top:8px;font-size:16px;opacity:0.9;">${monthName}</div>
    </div>

    <div style="padding:24px 32px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px;">
        <div style="background:#f8f9fa;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">Total Spent</div>
          <div style="font-size:24px;font-weight:700;color:#000;">₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        <div style="background:#e8f8e8;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">Reimbursable</div>
          <div style="font-size:24px;font-weight:700;color:#27ae60;">₹${reimbursableAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        <div style="background:#fff3e0;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">Net Expense</div>
          <div style="font-size:24px;font-weight:700;color:#e67e22;">₹${netAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <h2 style="font-size:16px;font-weight:700;color:#000;margin-bottom:12px;">By Category</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">CATEGORY</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">AMOUNT</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">SHARE</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>

      ${reimbursableRows ? `
      <h2 style="font-size:16px;font-weight:700;color:#000;margin-bottom:12px;">Reimbursable Items</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">DATE</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">DESCRIPTION</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">NOTE</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${reimbursableRows}</tbody>
      </table>` : ''}

      <div style="margin-top:24px;padding:16px;background:#f6f5f4;border-radius:8px;font-size:13px;color:#888;text-align:center;">
        Report generated by Knowledge Vault • ${new Date().toLocaleDateString('en-IN')}
      </div>
    </div>
  </div>
</body>
</html>`

    // Send email via SMTP
    const transporter = createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: (settings.smtp_port || 587) === 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    })

    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to: settings.notify_email || settings.smtp_user,
      subject: `📊 Finance Report — ${monthName}`,
      html: htmlEmail,
    })

    // Save summary note to vault
    const summaryText = `Total: ₹${totalAmount.toLocaleString('en-IN')} | Reimbursable: ₹${reimbursableAmount.toLocaleString('en-IN')} | Net: ₹${netAmount.toLocaleString('en-IN')}\n\nCategory Breakdown:\n${Object.entries(byCategory).map(([k, v]) => `${k}: ₹${Number(v).toLocaleString('en-IN')}`).join('\n')}`
    await sb.from('notes').insert({
      user_id: userId,
      title: `Finance Report — ${monthName}`,
      description: summaryText,
      categories: ['Finance'],
      tags: ['report', 'finance', 'monthly'],
      priority: 'medium',
      status: 'active',
      related_people: [], related_companies: [], related_technologies: [], related_projects: [],
      attachments: [], favourite: false, archived: false,
    })

    return new Response(JSON.stringify({
      success: true,
      monthName,
      totalExpenses: allExpenses.length,
      totalAmount,
      reimbursableAmount,
      netAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('send-finance-report error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
