const fs = require('fs');

let c = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const sIdx = c.indexOf('{schools.filter(s => handleQueryFilter(s, [\'id\', \'name\', \'address\', \'contactPerson\'])).map((sch) => {');
const sEndIdx = c.indexOf('</div>\n                      </div>\n                    </div>\n                  )\n                })}');

if (sIdx !== -1 && sEndIdx !== -1) {
  const replacement = `                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSchoolDragEnd}>
                    <SortableContext items={schools.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                      {schools
                        .filter((s: any) => handleQueryFilter(s, ['id', 'name', 'address', 'contactPerson']))
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0;
                          const iA = schoolOrder.indexOf(a.id);
                          const iB = schoolOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((sch: any) => {
                          const schClasses = classes.filter((c: any) => c.schoolId === sch.id);
                          return (
                            <SortableSchoolRow 
                              key={sch.id}
                              sch={sch}
                              schClasses={schClasses}
                              onEdit={(s: any) => { setEditingSchool(s); setShowSchoolModal(true); }}
                              onDelete={handleDeleteSchool}
                            />
                          );
                        })}
                    </SortableContext>
                  </DndContext>`;
  c = c.substring(0, sIdx) + replacement + c.substring(sEndIdx + 104);
  console.log('Replaced schools map');
} else {
  console.log('Could not find schools block', sIdx, sEndIdx);
}

fs.writeFileSync('src/components/AdminDashboard.tsx', c);
