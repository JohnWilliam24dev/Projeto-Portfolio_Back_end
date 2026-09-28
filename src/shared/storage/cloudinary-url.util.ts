export interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

// CLOUDINARY_URL tem o formato `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
// Parseamos explicitamente em vez de depender do SDK ler process.env sozinho: assim a
// configuração não depende da ordem em que o dotenv/ConfigModule carrega o .env.
export function parseCloudinaryUrl(value: string | undefined): CloudinaryCredentials | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:' || !url.username || !url.password || !url.hostname) return null;
    return {
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}
