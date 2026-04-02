declare module "mailparser" {
  export function simpleParser(
    source: Buffer | string
  ): Promise<{
    text?: string | null;
    html?: string | boolean | null;
    to?: { value?: Array<{ name?: string | null; address?: string | null }> } | null;
    cc?: { value?: Array<{ name?: string | null; address?: string | null }> } | null;
    attachments: Array<{
      filename?: string | null;
      contentType?: string | null;
      size?: number | null;
    }>;
  }>;
}
