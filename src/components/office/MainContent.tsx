import React from 'react';
import { Tab } from './types';
import { CommandCenter } from './modules/CommandCenter';
import { Dashboard } from './modules/Dashboard';
import { ContractCenter } from './modules/ContractCenter';
import { ComplianceCenter } from './modules/ComplianceCenter';
import { TaskManagement } from './modules/TaskManagement';
import { DocumentCenter } from './modules/DocumentCenter';
import { TelegramIntegration } from './modules/TelegramIntegration';
import { PlaceholderModule } from './modules/PlaceholderModule';
import { CandidateManagement } from './modules/CandidateManagement';

interface MainContentProps {
  activeTab: Tab;
}

export function MainContent({ activeTab }: MainContentProps) {
  switch (activeTab) {
    case 'command-center':
      return <CommandCenter />;
    case 'dashboard':
      return <Dashboard />;
    case 'contracts':
      return <ContractCenter />;
    case 'compliance':
      return <ComplianceCenter />;
    case 'tasks':
      return <TaskManagement />;
    case 'documents':
      return <DocumentCenter />;
    case 'telegram':
      return <TelegramIntegration />;
    case 'candidates':
      return <CandidateManagement />;
    default:
      return <PlaceholderModule activeTab={activeTab} />;
  }
}
