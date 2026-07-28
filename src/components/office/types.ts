export type Tab = 
  | 'command-center'
  | 'dashboard'
  | 'contracts'
  | 'compliance'
  | 'documents'
  | 'templates'
  | 'ai-writer'
  | 'tasks'
  | 'calendar'
  | 'legal'
  | 'history'
  | 'ai-review'
  | 'assets'
  | 'licenses'
  | 'telegram'
  | 'candidates';

export interface ModuleConfig {
  id: Tab;
  label: string;
  icon: any; // Lucide icon
}
