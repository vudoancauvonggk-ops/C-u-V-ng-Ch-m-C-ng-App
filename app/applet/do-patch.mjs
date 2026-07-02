import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// 1. Add imports
content = content.replace(
  "import React, { useState, useRef } from 'react';",
  "import React, { useState, useRef } from 'react';\nimport { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';\nimport { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';\nimport { CSS } from '@dnd-kit/utilities';"
);

content = content.replace(
  "Trash2, Check",
  "Trash2, GripVertical, Check"
);

// 2. Add SortableTeacherRow component before AdminDashboard
const sortableComponent = `
const SortableTeacherRow = ({ teacher, formatVND, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: teacher.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative">
      <td className="p-3 font-mono font-bold text-slate-700 flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {teacher.id}
      </td>
      <td className="p-3">
        <div className="font-semibold text-slate-950 font-sans">{teacher.name}</div>
        <div className="text-[11px] text-slate-400">Sinh: {teacher.dob}</div>
      </td>
      <td className="p-3">
        <div className="text-slate-700 text-xs font-medium">{teacher.phone}</div>
        <div className="text-[11px] text-slate-400 font-mono">{teacher.email}</div>
      </td>
      <td className="p-3 text-right font-mono text-blue-700 font-bold">{formatVND(teacher.hourlyRate)}</td>
      <td className="p-3 text-right font-mono text-slate-700 font-semibold">{formatVND(teacher.monthlyAllowance)}</td>
      <td className="p-3 text-right font-mono text-emerald-600 font-semibold">+{formatVND(teacher.bonus)}</td>
      <td className="p-3 text-right font-mono text-red-600 font-semibold">-{formatVND(teacher.deduction)}</td>
      <td className="p-3 text-center">
        <span className={\`text-[10px] px-2 py-0.5 rounded font-mono font-semibold \${
          teacher.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
        }\`}>
          {teacher.status === 'active' ? 'ĐANG DẠY' : 'ĐÃ NGHỈ'}
        </span>
      </td>
      <td className="p-3 text-center">
        <div className="flex justify-center gap-2">
          <button onClick={() => onEdit(teacher)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Sửa hồ sơ">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(teacher.id, teacher.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Cho nghỉ việc">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function AdminDashboard`;

content = content.replace("export default function AdminDashboard", sortableComponent);

// 3. Add state hooks
const stateHooks = `
  const [teacherOrder, setTeacherOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_teacher_order_v1') || '[]'); } catch(e) { return []; }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTeacherDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeTeacher = teachers.find((t: any) => t.id === active.id);
      if (!activeTeacher) return;
      
      const orderedTeachers = [...teachers].sort((a: any, b: any) => {
        const indexA = teacherOrder.indexOf(a.id);
        const indexB = teacherOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      const oldIndex = orderedTeachers.findIndex((t: any) => t.id === active.id);
      const newIndex = orderedTeachers.findIndex((t: any) => t.id === over.id);
      
      const newOrdered = arrayMove(orderedTeachers, oldIndex, newIndex);
      const newIds = newOrdered.map((t: any) => t.id);
      setTeacherOrder(newIds);
      localStorage.setItem('etms_teacher_order_v1', JSON.stringify(newIds));
    }
  };

  const [activeTab, setActiveTab] = useState`;

content = content.replace("const [activeTab, setActiveTab] = useState", stateHooks);

// 4. Update the teachers list rendering
const newTableFull = `
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
                    <SortableContext items={teachers.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                      {[...teachers]
                        .filter((t: any) => handleQueryFilter(t, ['id', 'name', 'phone', 'email']))
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0; // Disable sort when searching
                          const indexA = teacherOrder.indexOf(a.id);
                          const indexB = teacherOrder.indexOf(b.id);
                          if (indexA === -1 && indexB === -1) return 0;
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        })
                        .map((teacher: any) => (
                          <SortableTeacherRow 
                            key={teacher.id} 
                            teacher={teacher} 
                            formatVND={formatVND}
                            onEdit={(t: any) => { setEditingTeacher(t); setShowTeacherModal(true); }}
                            onDelete={handleDeleteTeacher}
                          />
                        ))}
                    </SortableContext>
                  </DndContext>
`;

const regex = /\{teachers\.filter\(t => handleQueryFilter\(t, \['id', 'name', 'phone', 'email'\]\)\)\.map\(\(teacher\) => \([\s\S]*?<\/tr>\n\s*\)\)\}/;
content = content.replace(regex, newTableFull.trim());

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patch complete.');
