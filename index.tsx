import React, { useState, useCallback, DragEvent, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Type Declarations ---
declare const mammoth: any;
declare const pdfjsLib: any;

type FileStatus = 'pending' | 'processing' | 'done' | 'error';
type AnalyzableFile = {
  file: File;
  startPage: string;
  endPage: string;
  status: FileStatus;
};
type OutputFormat = 'analysis' | 'contrast' | 'table' | 'reference' | 'assessment';
type Theme = 'light' | 'dark';
type OutputLanguage = 'vietnamese' | 'english';
type OutputLength = 'short' | 'medium' | 'detailed';
type CitationStyle = 'apa' | 'mla' | 'chicago' | 'vancouver' | 'ama';
type ConversationPart = {
  role: 'user' | 'model';
  content: string;
  format: 'analysis' | 'contrast' | 'table' | 'reference' | 'assessment' | 'qa' | 'report';
};
type GroundingChunk = { web?: { uri?: string; title?: string; } };
type Tab = {
  id: string;
  title: string;
  conversation: ConversationPart[];
  groundingSources: GroundingChunk[];
  outputFormat: OutputFormat | 'report';
  fontSize: number;
  systemInstruction?: string;
  initialTexts?: string;
};


// --- SVG Icons ---
const Icons = {
  Logo: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Sun: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>),
  UploadCloud: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>),
  FilePdf: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10 15.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 1-.5-.5V12a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H11v1h1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v1c0 .28.22.5.5.5zM15.5 12H14a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1.5a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm-1.5 2.5h1M4.5 12H6v4h-.5a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5z"></path></svg>),
  FileDocx: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-7"></path><path d="M10.5 11l1.5 1.5 1.5-1.5"></path><path d="M15.5 11l-3 7-3-7"></path></svg>),
  Zap: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>),
  Trash2: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>),
  Loader: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>),
  CheckCircle: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>),
  XCircle: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>),
  Copy: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>),
  Send: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>),
  Link: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>),
  ZoomIn: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>),
  ZoomOut: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>),
  X: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>),
  FileText: (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>),
};

// --- API Initialization ---
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

// --- Main App Component ---
const App = () => {
  // State management
  const [theme, setTheme] = useState<Theme>('light');
  const [files, setFiles] = useState<AnalyzableFile[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTabsForReport, setSelectedTabsForReport] = useState<Set<string>>(new Set());
  
  // Advanced options state
  const [language, setLanguage] = useState<OutputLanguage>('vietnamese');
  const [length, setLength] = useState<OutputLength>('medium');
  const [focus, setFocus] = useState('');
  const [citation, setCitation] = useState<CitationStyle>('vancouver');
  const [customPrompt, setCustomPrompt] = useState('');

  const outputRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

  // --- Theme Handling ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  // --- Toast Notification ---
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- File Handling ---
  const handleFileChange = (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles: AnalyzableFile[] = Array.from(selectedFiles)
        .filter(file => file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .map(file => ({ file, startPage: '', endPage: '', status: 'pending' }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleFileChange(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateFilePageRange = (index: number, field: 'startPage' | 'endPage', value: string) => {
    setFiles(files.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  // --- Text Extraction Logic ---
  const extractTextFromFile = async (fileWrapper: AnalyzableFile): Promise<string> => {
    const { file, startPage, endPage } = fileWrapper;
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const start = parseInt(startPage, 10) || 1;
      const end = parseInt(endPage, 10) || pdf.numPages;
      let text = '';
      for (let i = start; i <= Math.min(end, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n\n';
      }
      return `--- Bắt đầu tài liệu: ${file.name} ---\n${text}--- Kết thúc tài liệu: ${file.name} ---\n\n`;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return `--- Bắt đầu tài liệu: ${file.name} ---\n${result.value}\n--- Kết thúc tài liệu: ${file.name} ---\n\n`;
    }
    return '';
  };
  
  const outputFormatOptions = [
    { id: 'analysis', label: 'Phân tích', tooltip: 'Phân tích học thuật sâu về nội dung, phương pháp và kết luận chính của tài liệu.' },
    { id: 'contrast', label: 'Đối chiếu', tooltip: 'So sánh chi tiết, tìm điểm tương đồng, khác biệt và mâu thuẫn giữa các tài liệu.' },
    { id: 'table', label: 'Bảng', tooltip: 'Tạo bảng tóm tắt so sánh các tài liệu theo các tiêu chí chính.' },
    { id: 'reference', label: 'Tham khảo', tooltip: 'Tìm kiếm và tạo danh mục tài liệu tham khảo liên quan từ các nguồn học thuật uy tín.' },
    { id: 'assessment', label: 'Đánh giá', tooltip: 'Đánh giá mức độ bằng chứng và các thiên kiến (bias) tiềm ẩn trong nghiên cứu.' }
  ];

  // --- Prompt Engineering ---
  const buildPrompt = (format: OutputFormat) => {
    let prompt = `Bạn là một trợ lý AI chuyên nghiệp trong lĩnh vực y khoa, có nhiệm vụ phân tích và tổng hợp các tài liệu học thuật.`;

    const options = [
        `Ngôn ngữ đầu ra: ${language === 'vietnamese' ? 'Tiếng Việt' : 'Tiếng Anh'}.`,
        `Văn phong: chuyên gia, học thuật, trang trọng, sử dụng trong các báo cáo khoa học chuyên ngành.`,
        `Độ dài kết quả: ${length === 'short' ? 'ngắn gọn, súc tích' : length === 'medium' ? 'chi tiết vừa phải' : 'rất chi tiết và toàn diện'}.`
    ];
    
    if (focus) options.push(`Trọng tâm phân tích: ${focus}.`);
    if (customPrompt) options.push(`Yêu cầu tùy chỉnh thêm: ${customPrompt}`);

    prompt += `\n\nVui lòng tuân thủ các yêu cầu sau:\n- ${options.join('\n- ')}`;

    const citationInstruction = `\n\nQUY TẮC TRÍCH DẪN BẮT BUỘC: Mọi thông tin, dữ liệu, hoặc kết luận được rút ra từ tài liệu phải được trích dẫn ngay tại chỗ. Sử dụng định dạng sau ở cuối câu hoặc đoạn văn có chứa thông tin đó: [Nguồn: tên tệp đầy đủ]. Ví dụ: "... cho thấy hiệu quả điều trị cao [Nguồn: clinical_trial_2023.pdf]." Việc trích dẫn nguồn tài liệu đã cung cấp là BẮT BUỘC.`;

    switch (format) {
        case 'analysis':
            prompt += citationInstruction;
            prompt += `\n\nThực hiện phân tích học thuật sâu về nội dung, phương pháp, và kết luận chính của các tài liệu được cung cấp.`;
            break;
        case 'contrast':
            prompt += citationInstruction;
            prompt += `\n\nThực hiện một phân tích so sánh chi tiết giữa các tài liệu. Xác định các điểm tương đồng, khác biệt, và mâu thuẫn về phương pháp, kết quả và kết luận. Cấu trúc bài phân tích phải rõ ràng, có phần mở đầu, các luận điểm so sánh theo chủ đề, và phần kết luận tổng hợp.`;
            break;
        case 'table':
            prompt += citationInstruction;
            prompt += `\n\nTạo một bảng tóm tắt so sánh các tài liệu. Các cột của bảng nên bao gồm các mục chính như: Tên nghiên cứu, Tác giả, Năm xuất bản, Phương pháp nghiên cứu, Cỡ mẫu, Can thiệp chính, Kết quả chính, Kết luận, và một cột "Nguồn" để chỉ rõ tên tệp tài liệu cho mỗi hàng.`;
            break;
        case 'reference':
            prompt += `\n\nDựa vào nội dung chính của tài liệu, hãy tìm kiếm và tạo ra một danh mục tài liệu tham khảo gồm các bài báo khoa học, nghiên cứu lâm sàng, hoặc các nguồn y khoa uy tín khác có liên quan. Định dạng danh mục theo kiểu trích dẫn "${citation}". Cung cấp một chú thích ngắn cho mỗi tài liệu tham khảo giải thích sự liên quan của nó.`;
            break;
        case 'assessment':
            prompt += citationInstruction;
            prompt += `\n\nThực hiện đánh giá chi tiết về mức độ bằng chứng và các thiên kiến (bias) có thể có trong tài liệu. Phân tích bao gồm: xác định loại hình nghiên cứu (ví dụ: RCT, nghiên cứu đoàn hệ, báo cáo ca bệnh), đánh giá các điểm mạnh và điểm yếu trong phương pháp luận (ví dụ: cỡ mẫu, phương pháp chọn mẫu, nhóm chứng, thời gian theo dõi), và đưa ra kết luận về mức độ tin cậy của bằng chứng được trình bày.`;
            break;
    }
    return prompt;
  };
  

  // --- API Call & Streaming ---
  const handleAnalysis = async () => {
    if (!ai || files.length === 0) return;

    setError(null);
    setIsLoading(true);
    
    // Process files sequentially and update UI
    let allTexts = '';
    const updatedFiles = [...files];
    let fileReadError = false;

    for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i].status = 'processing';
        setFiles([...updatedFiles]);
        try {
            const text = await extractTextFromFile(updatedFiles[i]);
            allTexts += text;
            updatedFiles[i].status = 'done';
            setFiles([...updatedFiles]);
        } catch (e) {
            console.error("Error reading file:", updatedFiles[i].file.name, e);
            updatedFiles[i].status = 'error';
            setFiles([...updatedFiles]);
            setError(`Lỗi khi đọc tệp: ${updatedFiles[i].file.name}. Vui lòng kiểm tra lại tệp.`);
            fileReadError = true;
            break; // Stop processing further files
        }
    }

    if (fileReadError) {
        setIsLoading(false);
        return;
    }

    setIsStreaming(true);

    const newTabId = `tab-${Date.now()}`;
    const formatLabel = outputFormatOptions.find(opt => opt.id === outputFormat)?.label || 'Kết quả';
    const existingFormatCount = tabs.filter(tab => tab.outputFormat === outputFormat).length;
    const newTabTitle = `${formatLabel} ${existingFormatCount + 1}`;
    const systemInstruction = buildPrompt(outputFormat);

    const newTab: Tab = {
      id: newTabId,
      title: newTabTitle,
      conversation: [{ role: 'model', content: '', format: outputFormat }],
      groundingSources: [],
      outputFormat: outputFormat,
      fontSize: 16,
      systemInstruction: systemInstruction,
      initialTexts: allTexts,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    
    try {
      const contents = allTexts;
      
      const config: any = {};
      if (outputFormat === 'reference') {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction, ...config }
      });

      let currentContent = '';
      
      for await (const chunk of response) {
        currentContent += chunk.text;
        
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.id === newTabId) {
            const updatedConversation = [{ role: 'model' as 'model', content: currentContent, format: outputFormat }];
            let updatedSources = tab.groundingSources;
            if (chunk.candidates && chunk.candidates[0].groundingMetadata?.groundingChunks) {
              const newSources = chunk.candidates[0].groundingMetadata.groundingChunks as GroundingChunk[];
              updatedSources = [...tab.groundingSources, ...newSources].filter(
                 (source, index, self) => index === self.findIndex(s => s.web?.uri === source.web?.uri)
              );
            }
            return { ...tab, conversation: updatedConversation, groundingSources: updatedSources };
          }
          return tab;
        }));
      }
    } catch (e: any) {
      console.error("Analysis Error:", e);
      setError("Đã xảy ra lỗi trong quá trình phân tích. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };
  
  const handleFollowUp = async () => {
    if (!ai || !followUp.trim() || !activeTabId || !activeTab) return;

    const userMessage = followUp.trim();
    setFollowUp('');
    setIsStreaming(true);
    setError(null);

    const updatedConversation: ConversationPart[] = [
        ...activeTab.conversation, 
        { role: 'user', content: userMessage, format: 'qa' },
        { role: 'model', content: '', format: 'qa' } // Placeholder for model's response
    ];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, conversation: updatedConversation } : t));

    try {
      const initialUserContent = {
        role: 'user' as 'user',
        parts: [{ text: activeTab.initialTexts || '' }]
      };
      
      const history = updatedConversation.slice(0, -1).map(part => ({
          role: part.role,
          parts: [{ text: part.content }]
      }));
      
      const contents = [initialUserContent, ...history];

      const config: any = {};
      if (activeTab.outputFormat === 'reference') {
        config.tools = [{ googleSearch: {} }];
      }
      if (activeTab.systemInstruction) {
        config.systemInstruction = activeTab.systemInstruction;
      }

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: config
      });
      
      let currentContent = '';
      for await (const chunk of response) {
        currentContent += chunk.text;
        
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.id === activeTabId) {
            const newConv = [...tab.conversation];
            newConv[newConv.length - 1] = { role: 'model', content: currentContent, format: 'qa' };
             let updatedSources = tab.groundingSources;
            if (chunk.candidates && chunk.candidates[0].groundingMetadata?.groundingChunks) {
                const newSources = chunk.candidates[0].groundingMetadata.groundingChunks as GroundingChunk[];
                updatedSources = [...tab.groundingSources, ...newSources].filter(
                   (source, index, self) => index === self.findIndex(s => s.web?.uri === source.web?.uri)
                );
            }
            return { ...tab, conversation: newConv, groundingSources: updatedSources };
          }
          return tab;
        }));
      }

    } catch (e) {
      console.error("Follow-up Error:", e);
      setError("Đã xảy ra lỗi khi gửi câu hỏi. Vui lòng thử lại.");
      // Remove placeholder on error
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, conversation: t.conversation.slice(0, -1) } : t));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!ai || selectedTabsForReport.size === 0) return;

    setError(null);
    setIsLoading(true);
    setIsReportModalOpen(false);

    const selectedTabsData = tabs.filter(tab => selectedTabsForReport.has(tab.id));
    const combinedContent = selectedTabsData.map(tab => {
        const modelContent = tab.conversation
            .filter(part => part.role === 'model')
            .map(part => part.content)
            .join('\n\n');
        return `--- Bắt đầu nội dung từ tab: "${tab.title}" ---\n${modelContent}\n--- Kết thúc nội dung từ tab: "${tab.title}" ---\n\n`;
    }).join('');

    const systemInstruction = `Bạn là một trợ lý AI chuyên viết báo cáo khoa học trong lĩnh vực y khoa. Dựa vào các nội dung phân tích được cung cấp dưới đây, hãy tổng hợp chúng thành một bản nháp báo cáo khoa học hoàn chỉnh.
    YÊU CẦU BẮT BUỘC:
    1.  Cấu trúc báo cáo phải bao gồm các phần chính sau, được định dạng bằng Markdown heading:
        -   # 1. Giới thiệu (Introduction)
        -   # 2. Phương pháp (Methods)
        -   # 3. Kết quả (Results)
        -   # 4. Bàn luận (Discussion)
        -   # 5. Kết luận (Conclusion)
    2.  Văn phong phải chuyên gia, học thuật, trang trọng.
    3.  Tổng hợp thông tin một cách mạch lạc, kết nối các ý tưởng từ các phần nội dung khác nhau. KHÔNG liệt kê lại nội dung một cách máy móc.
    4.  Giữ lại các trích dẫn nguồn có sẵn (ví dụ: [Nguồn: file_name.pdf]) trong nội dung gốc khi đưa vào báo cáo. Đây là yêu cầu BẮT BUỘC.
    5.  Ngôn ngữ đầu ra là Tiếng Việt.`;

    setIsStreaming(true);

    const newTabId = `tab-${Date.now()}`;
    const existingReportCount = tabs.filter(tab => tab.outputFormat === 'report').length;
    const newTabTitle = `Bản nháp Báo cáo ${existingReportCount + 1}`;

    const newTab: Tab = {
      id: newTabId,
      title: newTabTitle,
      conversation: [{ role: 'model', content: '', format: 'report' }],
      groundingSources: [],
      outputFormat: 'report',
      fontSize: 16,
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    setSelectedTabsForReport(new Set()); // Clear selection

    try {
        const contents = [{ role: 'user', parts: [{ text: combinedContent }] }];
        
        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { systemInstruction }
        });

        let currentContent = '';
        for await (const chunk of response) {
            currentContent += chunk.text;
            setTabs(prevTabs => prevTabs.map(tab => 
                tab.id === newTabId 
                    ? { ...tab, conversation: [{ role: 'model', content: currentContent, format: 'report' }] } 
                    : tab
            ));
        }
    } catch (e: any) {
        console.error("Report Generation Error:", e);
        setError("Đã xảy ra lỗi trong quá trình tạo báo cáo. Vui lòng thử lại.");
    } finally {
        setIsLoading(false);
        setIsStreaming(false);
    }
};
  
  // --- UI Controls & Tab Management ---
  const FONT_SIZE_STEP = 1;
  const MIN_FONT_SIZE = 12;
  const MAX_FONT_SIZE = 24;
  
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
  };
  
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
      e.stopPropagation();
      setTabs(prevTabs => {
          const newTabs = prevTabs.filter(tab => tab.id !== tabIdToClose);
          if (activeTabId === tabIdToClose) {
              setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
          }
          return newTabs;
      });
  };

  const increaseFontSize = () => {
    if (!activeTabId) return;
    setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === activeTabId ? { ...tab, fontSize: Math.min(tab.fontSize + FONT_SIZE_STEP, MAX_FONT_SIZE) } : tab
    ));
  };

  const decreaseFontSize = () => {
    if (!activeTabId) return;
    setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === activeTabId ? { ...tab, fontSize: Math.max(tab.fontSize - FONT_SIZE_STEP, MIN_FONT_SIZE) } : tab
    ));
  };

  const handleCopy = () => {
    if (!activeTab) return;
      const textToCopy = activeTab.conversation
        .filter(part => part.role === 'model')
        .map(part => part.content)
        .join('\n\n');
      
      if (textToCopy) {
          navigator.clipboard.writeText(textToCopy).then(() => {
              showToast('Đã sao chép vào clipboard!');
          }).catch(err => {
              console.error('Failed to copy text: ', err);
              showToast('Lỗi khi sao chép!');
          });
      }
  };

  const handleToggleReportTabSelection = (tabId: string) => {
    setSelectedTabsForReport(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tabId)) {
            newSet.delete(tabId);
        } else {
            newSet.add(tabId);
        }
        return newSet;
    });
  };

  // --- Auto-scroll ---
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tabs, activeTabId]);
  
  // --- Render Functions ---
  const renderFileStatusIndicator = (status: FileStatus) => {
    const iconMap = {
      processing: <Icons.Loader className="status-icon processing" />,
      done: <Icons.CheckCircle className="status-icon done" />,
      error: <Icons.XCircle className="status-icon error" />,
      pending: <div className="status-icon" />
    };
    return iconMap[status];
  };

  return (
    <>
      <Header onToggleTheme={toggleTheme} currentTheme={theme} />
      <main>
        <div className="app-container">
          {/* Controls Panel */}
          <div className="panel controls-panel">
             <p className="panel-subtitle">Tải lên tài liệu PDF hoặc DOCX để bắt đầu.</p>
            
            <div className="control-section">
                <FileDropZone onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onFileChange={handleFileChange} />
            </div>

            {files.length > 0 && <div className="file-count-indicator">{files.length} tài liệu đã được chọn</div>}
            
            {files.length > 0 && (
              <div className="control-section">
                <ul id="file-list">
                  {files.map((fileWrapper, index) => (
                    <li key={index} className={fileWrapper.status === 'error' ? 'file-item-error' : ''}>
                      <div className="file-info">
                        {renderFileStatusIndicator(fileWrapper.status)}
                        {fileWrapper.file.type === 'application/pdf' ? <Icons.FilePdf className="file-icon" /> : <Icons.FileDocx className="file-icon" />}
                        <span>{fileWrapper.file.name}</span>
                      </div>
                      <div className="file-actions">
                        {fileWrapper.file.type === 'application/pdf' && (
                          <div className="page-range-inputs">
                            <input type="text" placeholder="Trang bắt đầu" className="input-base" value={fileWrapper.startPage} onChange={(e) => updateFilePageRange(index, 'startPage', e.target.value)} />
                            <input type="text" placeholder="Trang kết thúc" className="input-base" value={fileWrapper.endPage} onChange={(e) => updateFilePageRange(index, 'endPage', e.target.value)} />
                          </div>
                        )}
                        <button onClick={() => removeFile(index)} className="btn-icon remove-btn" aria-label="Remove file">
                          <Icons.Trash2 style={{ width: 18, height: 18 }} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="control-section">
                <label>Định dạng đầu ra</label>
                <div className="segmented-control five-options">
                  {outputFormatOptions.map(opt => (
                     <div key={opt.id} className="tooltip-container-btn">
                       <button 
                         className={outputFormat === opt.id ? 'active' : ''} 
                         onClick={() => setOutputFormat(opt.id as OutputFormat)}
                       >
                         {opt.label}
                       </button>
                       <span className="tooltip-text-btn">{opt.tooltip}</span>
                     </div>
                  ))}
                </div>
            </div>

            <div className="control-section advanced-options">
                <details>
                    <summary>Tùy chọn nâng cao</summary>
                    <div className="advanced-options-content">
                        <div className="control-section">
                            <label htmlFor="language">Ngôn ngữ</label>
                            <select id="language" className="input-base" value={language} onChange={e => setLanguage(e.target.value as OutputLanguage)}>
                                <option value="vietnamese">Tiếng Việt</option>
                                <option value="english">Tiếng Anh</option>
                            </select>
                        </div>
                        <div className="control-section">
                            <label htmlFor="length">Độ dài</label>
                            <select id="length" className="input-base" value={length} onChange={e => setLength(e.target.value as OutputLength)}>
                                <option value="short">Ngắn</option>
                                <option value="medium">Vừa</option>
                                <option value="detailed">Chi tiết</option>
                            </select>
                        </div>
                        <div className="control-section">
                           <label className="label-with-tooltip" htmlFor="citation">
                             <span>Kiểu trích dẫn</span>
                             <div className="tooltip-container">
                               <span className="tooltip-icon">?</span>
                               <span className="tooltip-text">Chọn định dạng trích dẫn được sử dụng trong kết quả phân tích và danh mục tham khảo.</span>
                             </div>
                           </label>
                           <select id="citation" className="input-base" value={citation} onChange={e => setCitation(e.target.value as CitationStyle)}>
                               <option value="apa">APA</option>
                               <option value="mla">MLA</option>
                               <option value="chicago">Chicago</option>
                               <option value="vancouver">Vancouver</option>
                               <option value="ama">AMA</option>
                           </select>
                       </div>
                        <div className="control-section">
                           <label className="label-with-tooltip" htmlFor="focus">
                             <span>Trọng tâm phân tích</span>
                             <div className="tooltip-container">
                               <span className="tooltip-icon">?</span>
                               <span className="tooltip-text">Chỉ định các khía cạnh cụ thể cần AI tập trung phân tích (ví dụ: phương pháp điều trị, tác dụng phụ, so sánh hiệu quả).</span>
                             </div>
                           </label>
                            <input type="text" id="focus" className="input-base" value={focus} onChange={e => setFocus(e.target.value)} placeholder="ví dụ: phương pháp điều trị, tác dụng phụ..." />
                        </div>
                        <div className="control-section">
                           <label className="label-with-tooltip" htmlFor="custom-prompt">
                             <span>Thêm yêu cầu tùy chỉnh</span>
                             <div className="tooltip-container">
                               <span className="tooltip-icon">?</span>
                               <span className="tooltip-text">Nhập bất kỳ yêu cầu cụ thể nào khác bạn muốn AI thực hiện.</span>
                             </div>
                           </label>
                            <textarea id="custom-prompt" className="input-base" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="ví dụ: chỉ so sánh 2 tài liệu đầu tiên..."></textarea>
                        </div>
                        <hr className="divider"/>
                        <div className="tooltip-container-btn">
                            <button className="btn-base btn-secondary" style={{ width: '100%' }} onClick={() => setIsReportModalOpen(true)} disabled={tabs.length === 0 || isLoading}>
                                <Icons.FileText style={{width: 18, height: 18}} />
                                Tạo bản nháp báo cáo
                            </button>
                            <span className="tooltip-text-btn" style={{ width: '300px', marginLeft: '-150px' }}>
                                Chọn các kết quả phân tích từ các tab đã tạo và tổng hợp chúng thành một bản nháp báo cáo khoa học có cấu trúc.
                            </span>
                        </div>
                    </div>
                </details>
            </div>

            <button className="btn-base btn-primary" onClick={handleAnalysis} disabled={files.length === 0 || isLoading}>
              {isLoading && !isStreaming ? 'Đang đọc tệp...' : isStreaming ? 'Đang phân tích...' : 'Phân tích'}
              {(isLoading) && <div className="spinner small"></div>}
            </button>
            {error && <p className="error-text">{error}</p>}
          </div>

          {/* Output Panel */}
          <div className="panel output-panel">
            {tabs.length > 0 && (
                <div className="panel-header">
                  <h2>Kết quả</h2>
                  <div className="output-actions">
                    <div className="btn-group">
                        <button onClick={decreaseFontSize} className="btn-icon" aria-label="Giảm kích thước chữ"><Icons.ZoomOut style={{ width: 20, height: 20 }} /></button>
                        <button onClick={increaseFontSize} className="btn-icon" aria-label="Tăng kích thước chữ"><Icons.ZoomIn style={{ width: 20, height: 20 }} /></button>
                    </div>
                    <button onClick={handleCopy} className="btn-icon" aria-label="Sao chép kết quả"><Icons.Copy style={{ width: 20, height: 20 }} /></button>
                  </div>
                </div>
            )}

            {tabs.length > 0 && (
              <div className="tab-bar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${tab.id === activeTabId ? 'active' : ''}`}
                    onClick={() => handleSelectTab(tab.id)}
                  >
                    <span>{tab.title}</span>
                    <button className="close-tab-btn" onClick={(e) => handleCloseTab(e, tab.id)} aria-label={`Close ${tab.title}`}>
                      <Icons.X style={{width: 14, height: 14}} />
                    </button>
                  </button>
                ))}
              </div>
            )}

            <div className="output-wrapper" ref={outputRef}>
              {isLoading && tabs.length === 0 && (
                <div className="placeholder">
                  <div className="spinner"></div>
                  <p>Phần mềm đang phân tích tài liệu...</p>
                  <p>Quá trình này có thể mất vài phút tùy thuộc vào số lượng và độ dài của tài liệu.</p>
                </div>
              )}
              {!isLoading && tabs.length === 0 && (
                <div className="placeholder">
                  <Icons.Zap />
                  <h2>Kết quả phân tích sẽ xuất hiện ở đây</h2>
                  <p>Tải lên tài liệu và nhấn "Phân tích" để bắt đầu.</p>
                </div>
              )}
              {activeTab && (
                <div className="results-and-qa-container" style={{ fontSize: `${activeTab.fontSize}px` }}>
                    {activeTab.conversation.map((part, index) => (
                      <div key={index} className={`conversation-part ${part.role}`}>
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
                      </div>
                    ))}
                    {activeTab.groundingSources.length > 0 && (
                        <div className="grounding-sources">
                            <h3><Icons.Link /> Nguồn được tham khảo</h3>
                            <ul>
                               {activeTab.groundingSources
                                 .filter(source => source.web?.uri && source.web.title)
                                 .map((source, index) => (
                                   <li key={index}><a href={source.web!.uri} target="_blank" rel="noopener noreferrer">{index + 1}. {source.web!.title}</a></li>
                                 ))}
                            </ul>
                        </div>
                    )}
                </div>
              )}
            </div>
            {activeTab && !isLoading && (
              <div className="qa-section">
                <div className="qa-input-wrapper">
                  <input
                    type="text"
                    className="input-base"
                    placeholder="Đặt câu hỏi tiếp theo..."
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleFollowUp()}
                    disabled={isStreaming}
                  />
                  <button onClick={handleFollowUp} disabled={isStreaming || !followUp.trim()} className="btn-icon send-btn" aria-label="Send follow-up question">
                    {isStreaming ? <div className="spinner small"></div> : <Icons.Send />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
      {toastMessage && <div className="toast">{toastMessage}</div>}
      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tabs={tabs}
        selectedTabs={selectedTabsForReport}
        onToggleSelection={handleToggleReportTabSelection}
        onGenerate={handleGenerateReport}
      />
    </>
  );
};

// --- Child Components ---
const Header = ({ onToggleTheme, currentTheme }: { onToggleTheme: () => void; currentTheme: Theme }) => (
  <header>
    <div className="header-title">
      <Icons.Logo />
      <h1>Phân tích Y văn</h1>
    </div>
    <button onClick={onToggleTheme} className="btn-icon" aria-label="Toggle theme">
      {currentTheme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
    </button>
  </header>
);

const FileDropZone = ({ onDrop, onDragOver, onDragLeave, onFileChange }: { onDrop: (e: DragEvent<HTMLDivElement>) => void; onDragOver: (e: DragEvent<HTMLDivElement>) => void; onDragLeave: (e: DragEvent<HTMLDivElement>) => void; onFileChange: (files: FileList | null) => void; }) => (
  <div className="file-drop-zone" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={() => document.getElementById('file-input')?.click()}>
    <Icons.UploadCloud className="drop-zone-icon" />
    <p>
      Kéo và thả tệp vào đây hoặc <span className="browse-btn">chọn tệp</span>
    </p>
    <p className="file-types">Hỗ trợ: PDF, DOCX</p>
    <input id="file-input" type="file" multiple accept=".pdf,.docx" onChange={(e) => onFileChange(e.target.files)} />
  </div>
);

const ReportModal = ({ isOpen, onClose, tabs, selectedTabs, onToggleSelection, onGenerate }: {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  selectedTabs: Set<string>;
  onToggleSelection: (tabId: string) => void;
  onGenerate: () => void;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tạo bản nháp báo cáo</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close modal"><Icons.X /></button>
        </div>
        <div className="modal-body">
            <p style={{marginBottom: '1rem', color: 'var(--c-text-secondary)', fontSize: '0.9rem'}}>Chọn các kết quả phân tích bạn muốn gộp vào báo cáo.</p>
            <ul className="report-tab-list">
                {tabs.filter(t => t.outputFormat !== 'report').map(tab => (
                    <li key={tab.id} className="report-tab-item">
                        <label>
                            <input type="checkbox" checked={selectedTabs.has(tab.id)} onChange={() => onToggleSelection(tab.id)} />
                            <span>{tab.title}</span>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
        <div className="modal-footer">
            <button className="btn-base btn-secondary" onClick={onClose}>Hủy</button>
            <button className="btn-base btn-primary" onClick={onGenerate} disabled={selectedTabs.size === 0}>
                Tạo báo cáo
            </button>
        </div>
      </div>
    </div>
  );
};

const AppFooter = () => (
    <footer className="app-footer">
        <p>@Sâu lười ham học</p>
    </footer>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);