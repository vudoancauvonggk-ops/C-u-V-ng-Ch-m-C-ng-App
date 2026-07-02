"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var content = fs_1.default.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');
var replacement = "    .sort((a, b) => {\n      // S\u00E1ng first, then Chi\u1EC1u\n      const getWeight = (session: string) => {\n         const s = session?.toLowerCase() || '';\n         if (s === 'morning' || s.includes('s\u00E1ng')) return 100;\n         if (s === 'afternoon' || s.includes('chi\u1EC1u')) return 200;\n         // If it's a time string like \"07:30\"\n         const match = s.match(/^(d{1,2})[:h]/);\n         if (match) return parseInt(match[1]) * 10;\n         return 300;\n      };\n      return getWeight(a.session) - getWeight(b.session);\n    })";
content = content.replace(/\.sort\(\(a, b\) => \{[\s\S]*?return aMorning \? -1 : 1;\s*\}\)/g, replacement);
fs_1.default.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Fixed sort');
