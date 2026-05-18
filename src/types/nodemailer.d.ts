declare module "nodemailer" {
  type TransportOptions = Record<string, unknown>;

  type MailOptions = {
    from?: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  };

  type Transporter = {
    sendMail(options: MailOptions): Promise<{ message?: string }>;
  };

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
