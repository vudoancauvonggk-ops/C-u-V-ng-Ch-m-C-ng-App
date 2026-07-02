import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `              </>
            )}
          </div>
        </div>`;

content = content.replace(/          <\/div>\s*\n\s*\n\s*\{\/\* BOTTOM APP NAVIGATION BAR \*\/\}/, replacement + '\n\n          {/* BOTTOM APP NAVIGATION BAR */}');

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Fixed syntax tags');
