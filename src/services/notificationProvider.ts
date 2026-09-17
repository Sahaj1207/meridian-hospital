import type { NotificationProvider } from '../types/notification.ts';

/**
 * Local development and demo provider.
 * Simulates email and SMS delivery locally without contacting external networks.
 * Strictly avoids logging patient contact details, confirmation tokens, or sensitive clinical information.
 */
export class LocalNotificationProvider implements NotificationProvider {
  readonly name = 'LocalDemoProvider';
  readonly is_live = false;

  private messageCounter = 1000;

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; message_id?: string; error?: string }> {
    this.messageCounter += 1;
    const messageId = `sim-email-${Date.now()}-${this.messageCounter}`;

    // Sanitized development logging: logs only simulated message ID and subject summary
    // Patient email, patient name, confirmation tokens, and clinical data are strictly omitted.
    if (process.env.NODE_ENV !== 'test') {
      const sanitizedSubject = params.subject.replace(/\[MRD-[A-Za-z0-9-]+\]/, '[REF]');
      console.log(`[Notification/LocalDev] Simulated email delivery initiated (${messageId}): "${sanitizedSubject}"`);
    }

    return {
      success: true,
      message_id: messageId
    };
  }

  async sendSms(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; message_id?: string; error?: string }> {
    this.messageCounter += 1;
    const messageId = `sim-sms-${Date.now()}-${this.messageCounter}`;

    // Sanitized development logging: logs only simulated message ID and character count
    // Phone number, patient name, and confirmation tokens are strictly omitted.
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Notification/LocalDev] Simulated SMS delivery initiated (${messageId}) [Length: ${params.body.length} chars]`);
    }

    return {
      success: true,
      message_id: messageId
    };
  }
}
