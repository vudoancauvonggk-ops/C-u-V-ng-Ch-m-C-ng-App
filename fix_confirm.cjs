const fs = require('fs');
const path = './src/components/SystemHealth.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("const [isClearing, setIsClearing] = useState(false);", "const [isClearing, setIsClearing] = useState(false);\n  const [showConfirmClear, setShowConfirmClear] = useState(false);");

content = content.replace(
  "  const handleClearImages = async () => {\n    if (!window.confirm('Bạn có chắc chắn muốn xoá tất cả hình ảnh chấm công cũ để giải phóng dung lượng?')) return;\n    setIsClearing(true);",
  "  const handleClearImages = async () => {\n    setIsClearing(true);\n    setShowConfirmClear(false);"
);

content = content.replace(
  "                  <button \n                    onClick={handleClearImages}",
  "                  <button \n                    onClick={() => setShowConfirmClear(true)}"
);

content = content.replace(
  "                  {clearMessage && (\n                    <p className={`mt-2 text-xs font-medium ${clearMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>\n                      {clearMessage.text}\n                    </p>\n                  )}",
  "                  {showConfirmClear && (\n                    <div className=\"mt-3 p-3 bg-red-50 border border-red-200 rounded-lg\">\n                      <p className=\"text-sm font-medium text-red-800 mb-2\">Bạn có chắc chắn muốn xoá tất cả hình ảnh chấm công cũ không?</p>\n                      <div className=\"flex gap-2\">\n                        <button onClick={handleClearImages} className=\"px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700\">\n                          Đồng ý xoá\n                        </button>\n                        <button onClick={() => setShowConfirmClear(false)} className=\"px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50\">\n                          Huỷ bỏ\n                        </button>\n                      </div>\n                    </div>\n                  )}\n                  {clearMessage && (\n                    <p className={`mt-2 text-xs font-medium ${clearMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>\n                      {clearMessage.text}\n                    </p>\n                  )}"
);

fs.writeFileSync(path, content);
console.log('Fixed window.confirm');
