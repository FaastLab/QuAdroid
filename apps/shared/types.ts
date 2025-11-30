export interface TestJob {
  id: string;
  url: string;
  credentials?: {
    username: string;
    password: string;
  };
  creditCard?: {
    number: string;
    expiry: string;
    cvv: string;
  };
  status: 'pending' | 'crawling' | 'crawl_completed' | 'generating' | 'testing' | 'completed' | 'failed';
  reportPath?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkerType = 
  | 'web-crawler'
  | 'user-journey'
  | 'api-test'
  | 'security-lite'
  | 'deep-security'
  | 'chat-test'
  | 'code-runner'
  | 'db-check'
  | 'ai-governance'
  | 'cicd-runner'
  | 'sandbox-runner'

export interface SubmitTestRequest {
  url: string;
  username?: string;
  password?: string;
  creditCard?: {
    number: string;
    expiry: string;
    cvv: string;
  };
  workers: WorkerType[];  // Which workers to run
}

export interface SubmitTestResponse {
  jobId: string;
  message: string;
}

export interface ReportResponse {
  jobId: string;
  status: TestJob['status'];
  reportPath?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

