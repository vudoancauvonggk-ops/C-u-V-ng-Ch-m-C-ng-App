import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');
content = content.replace('User, Calendar, Clock, DollarSign, ArrowLeftRight, Check, AlertCircle,', 'User, Calendar, Clock, DollarSign, ArrowLeftRight, Check, AlertCircle, Bell,');
fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
