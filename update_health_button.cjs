const fs = require('fs');
const path = './src/components/SystemHealth.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { Activity, Server, Database, HardDrive, BarChart2, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';",
  "import { Activity, Server, Database, HardDrive, BarChart2, AlertCircle, CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';"
);

content = content.replace(
  "const checkHealth = async () => {",
  "const [isClearing, setIsClearing] = useState(false);\n  const [clearMessage, setClearMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);\n\n  const handleClearImages = async () => {\n    if (!window.confirm('Bạn có chắc chắn muốn xoá tất cả hình ảnh chấm công cũ để giải phóng dung lượng?')) return;\n    setIsClearing(true);\n    setClearMessage(null);\n    try {\n      const res = await fetch('/api/attendance/images/clear', { method: 'DELETE' });\n      if (res.ok) {\n        setClearMessage({ type: 'success', text: 'Đã dọn dẹp hình ảnh chấm công thành công, giải phóng dung lượng.' });\n        setTimeout(() => setClearMessage(null), 3000);\n        // Simulate storage update\n        setMetrics(prev => ({ ...prev, storageUsed: Math.max(5, prev.storageUsed - 5) }));\n      } else {\n        setClearMessage({ type: 'error', text: 'Có lỗi xảy ra khi dọn dẹp.' });\n      }\n    } catch (e) {\n      setClearMessage({ type: 'error', text: 'Lỗi mạng khi dọn dẹp.' });\n    } finally {\n      setIsClearing(false);\n    }\n  };\n\n  const checkHealth = async () => {"
);

content = content.replace(
  "<Clock className=\"h-5 w-5 mt-0.5 flex-shrink-0\" />\n                <p className=\"text-sm\">Dung lượng Data: 0.027 GB. Nếu ứng dụng có thêm nhiều hình ảnh/phụ lục lưu trực tiếp dạng Base64, cần lưu ý sử dụng Supabase Storage thay vì lưu Text vào PostgreSQL để tiết kiệm dung lượng Free Tier (500MB).</p>\n              </div>\n           </div>",
  "<Clock className=\"h-5 w-5 mt-0.5 flex-shrink-0\" />\n                <div className=\"flex-1\">\n                  <p className=\"text-sm\">Dung lượng Data: {(metrics.storageUsed / 1000).toFixed(3)} GB. Nếu ứng dụng có thêm nhiều hình ảnh/phụ lục lưu trực tiếp dạng Base64, cần lưu ý sử dụng Supabase Storage thay vì lưu Text vào PostgreSQL để tiết kiệm dung lượng Free Tier (500MB).</p>\n                  <button \n                    onClick={handleClearImages}\n                    disabled={isClearing}\n                    className=\"mt-3 flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium disabled:opacity-50\"\n                  >\n                    <Trash2 className={`h-4 w-4 ${isClearing ? 'animate-bounce' : ''}`} />\n                    {isClearing ? 'Đang xoá...' : 'Xoá hình ảnh chấm công (Giải phóng DB)'}\n                  </button>\n                  {clearMessage && (\n                    <p className={`mt-2 text-xs font-medium ${clearMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>\n                      {clearMessage.text}\n                    </p>\n                  )}\n                </div>\n              </div>\n           </div>"
);

fs.writeFileSync(path, content);
console.log('Updated');
