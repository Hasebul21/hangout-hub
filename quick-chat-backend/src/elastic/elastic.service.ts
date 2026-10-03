import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Small wrapper around the Elasticsearch REST API. Plain fetch works the same
// against the local 8.x container and the hosted cluster, so we don't need the
// official client and its version checks.
@Injectable()
export class ElasticService {
  private readonly logger = new Logger(ElasticService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(config: ConfigService) {
    const url = new URL(
      config.get<string>('ELASTICSEARCH_URL') ?? 'http://localhost:9200',
    );

    // Hosted providers often put the credentials inside the url
    const username =
      config.get<string>('ELASTICSEARCH_USERNAME') ||
      decodeURIComponent(url.username);
    const password =
      config.get<string>('ELASTICSEARCH_PASSWORD') ||
      decodeURIComponent(url.password);
    if (username) {
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      this.headers['Authorization'] = `Basic ${token}`;
    }

    url.username = '';
    url.password = '';
    this.baseUrl = url.toString().replace(/\/$/, '');
  }

  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: this.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Elasticsearch ${method} ${path} -> ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async getDocument<T>(index: string, id: string): Promise<T | null> {
    const res = await fetch(
      `${this.baseUrl}/${index}/_doc/${encodeURIComponent(id)}`,
      { headers: this.headers },
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Elasticsearch get ${index}/${id} -> ${res.status}`);
    }
    const data = await res.json();
    return data._source as T;
  }

  async search<T>(index: string, query: object) {
    const data = await this.request('POST', `/${index}/_search`, query);
    const total =
      typeof data.hits.total === 'number'
        ? data.hits.total
        : data.hits.total.value;
    const items: T[] = data.hits.hits.map((hit: any) => hit._source);
    return { items, total: total as number };
  }

  async createIndexIfMissing(index: string, mappings: object) {
    const res = await fetch(`${this.baseUrl}/${index}`, {
      method: 'HEAD',
      headers: this.headers,
    });
    if (res.status === 200) {
      return;
    }
    await this.request('PUT', `/${index}`, { mappings });
    this.logger.log(`Created index ${index}`);
  }
}
