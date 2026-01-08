
import React, { useState, useEffect, useMemo } from 'react';
import { User, Entry, SubscriptionStatus, Locale, TemplateType, AIResponse } from './types';
import { I18N, BIBLE_BOOKS } from './constants';
import { getAIHelp } from './services/geminiService';

const LOCAL_STORAGE_KEY = 'gracelog_entries_v4';
const USER_KEY = 'gracelog_user_v4';
const DRAFT_KEY = 'gracelog_draft_v4';

const App: React.FC = () => {
  const [user, setUser] = useState<User>({
    userId: 'guest',
    locale: 'ko',
    subscriptionStatus: SubscriptionStatus.FREE
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'report' | 'settings'>('home');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);

  // Editor State
  const [book, setBook] = useState(BIBLE_BOOKS.ko[0]);
  const [chapter, setChapter] = useState(1);
  const [verseRange, setVerseRange] = useState('');
  const [reflection, setReflection] = useState('');
  const [application, setApplication] = useState('');
  const [prayer, setPrayer] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIResponse | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const t = I18N[user.locale];

  // Helper: 실시간 성경 이름 번역
  const translateBook = (bookName: string, targetLocale: Locale) => {
    let index = BIBLE_BOOKS.ko.indexOf(bookName);
    if (index === -1) index = BIBLE_BOOKS.en.indexOf(bookName);
    if (index === -1) return bookName; // 못찾으면 그대로
    return BIBLE_BOOKS[targetLocale][index];
  };

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedEntries) {
      const parsedEntries: Entry[] = JSON.parse(savedEntries);
      setEntries(parsedEntries);
      
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = parsedEntries.find(e => e.date === today);
      if (todayEntry) {
        loadEntryToEditor(todayEntry);
      } else {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const d = JSON.parse(draft);
          setBook(d.book);
          setChapter(d.chapter);
          setVerseRange(d.verseRange);
          setReflection(d.reflection);
          setApplication(d.application);
          setPrayer(d.prayer);
          setTags(d.tags);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'home') {
      const draft = { book, chapter, verseRange, reflection, application, prayer, tags };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [book, chapter, verseRange, reflection, application, prayer, tags]);

  useEffect(() => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  }, [user, entries]);

  const loadEntryToEditor = (entry: Entry) => {
    setEditingId(entry.id);
    // 에디터에 로드할 때는 현재 유저 언어에 맞는 책 이름으로 변환
    setBook(translateBook(entry.book, user.locale));
    setChapter(entry.chapter);
    setVerseRange(entry.verseRange || '');
    setReflection(entry.reflectionText);
    setApplication(entry.applicationText);
    setPrayer(entry.prayerText);
    setTags(entry.tags);
  };

  const streakCount = useMemo(() => {
    if (entries.length === 0) return 0;
    const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse();
    let count = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);
    
    for (const d of sortedDates) {
      if (d === checkDate.toISOString().split('T')[0]) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
    return count;
  }, [entries]);

  const handleSave = () => {
    if (!reflection.trim()) {
      alert(user.locale === 'ko' ? "묵상 내용을 입력해주세요." : "Please enter your reflection.");
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newEntry: Entry = {
      id: editingId || Date.now().toString(),
      date: today,
      book, // 현재 에디터에 선택된 언어 상태 그대로 저장 (추후 translateBook으로 변환하여 보여줌)
      chapter,
      verseRange,
      templateType: TemplateType.FREE,
      reflectionText: reflection,
      applicationText: application,
      prayerText: prayer,
      tags,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (editingId) {
      setEntries(prev => prev.map(e => e.id === editingId ? newEntry : e));
    } else {
      setEntries(prev => [newEntry, ...prev]);
      setEditingId(newEntry.id);
    }
    
    localStorage.removeItem(DRAFT_KEY);
    alert(user.locale === 'ko' ? "기록이 저장되었습니다." : "Saved!");
  };

  const requestAIHelp = async () => {
    if (user.subscriptionStatus !== SubscriptionStatus.PREMIUM) {
      alert(user.locale === 'ko' ? "AI 도움은 프리미엄 전용입니다." : "AI Assist is for Premium users.");
      return;
    }
    if (reflection.length < 5) {
      alert(user.locale === 'ko' ? "묵상을 더 작성해주세요." : "Write more reflection first.");
      return;
    }

    setIsAIThinking(true);
    try {
      const result = await getAIHelp(book, chapter, reflection, tags, user.locale);
      setAiSuggestions(result);
    } catch (error) {
      alert("AI Error: " + error);
    } finally {
      setIsAIThinking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(user.locale === 'ko' ? "복사되었습니다!" : "Copied!");
    setShowShareModal(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(tag => tag !== t));

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, current: false, date: "" });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, current: true, date: dateStr });
    }

    const filteredEntries = entries.filter(e => e.date === selectedCalendarDate);

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-blue-500"><i className="fa-solid fa-chevron-left"></i></button>
          <h3 className="font-black text-slate-800 tracking-tight">
            {year}. {String(month + 1).padStart(2, '0')}
          </h3>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-blue-500"><i className="fa-solid fa-chevron-right"></i></button>
        </div>

        <div className="grid grid-cols-7 gap-y-4 mb-4">
          {t.days.map(d => <span key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</span>)}
          {days.map((d, idx) => {
            const hasEntry = entries.some(e => e.date === d.date);
            const isSelected = selectedCalendarDate === d.date;
            return (
              <button 
                key={idx} 
                disabled={!d.current}
                onClick={() => d.date && setSelectedCalendarDate(d.date)}
                className={`relative h-10 flex flex-col items-center justify-center transition-all ${!d.current ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <span className={`text-sm font-bold z-10 ${isSelected ? 'text-white' : 'text-slate-600'}`}>{d.day}</span>
                {isSelected && <div className="absolute inset-0 bg-blue-600 rounded-xl scale-75 animate-fade-in"></div>}
                {hasEntry && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full"></div>}
              </button>
            );
          })}
        </div>

        <div className="pt-6 border-t border-slate-50 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedCalendarDate} {filteredEntries.length > 0 ? `(${filteredEntries.length})` : ""}
          </h4>
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-slate-300 italic py-4">{t.noRecords}</p>
          ) : (
            filteredEntries.map(e => (
              <div key={e.id} onClick={() => { setActiveTab('home'); loadEntryToEditor(e); }} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-blue-200 transition-all">
                <div>
                  <p className="text-sm font-bold text-slate-800">{translateBook(e.book, user.locale)} {e.chapter}{e.verseRange ? ':' + e.verseRange : ''}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{e.reflectionText}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-blue-300 transition-colors"></i>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen relative shadow-2xl flex flex-col">
      <header className="bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-40 border-b">
        <h1 className="text-xl font-bold text-blue-600 italic tracking-tighter">GraceLog</h1>
        <div className="flex items-center space-x-2">
           <span className={`w-2 h-2 rounded-full ${user.subscriptionStatus === SubscriptionStatus.PREMIUM ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
             {user.subscriptionStatus === SubscriptionStatus.PREMIUM ? t.premium : t.free}
           </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && (
          <div className="p-5 space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-end space-x-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">{t.selectBook}</label>
                  <select 
                    value={book} onChange={e => setBook(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    {BIBLE_BOOKS[user.locale].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="w-20 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">{t.chapter}</label>
                  <input 
                    type="number" value={chapter} onChange={e => setChapter(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t.verseRange}</label>
                <input 
                  type="text" value={verseRange} onChange={e => setVerseRange(e.target.value)}
                  placeholder={t.verseRange}
                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t.reflection}</label>
                <textarea 
                  value={reflection} onChange={e => setReflection(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm min-h-[140px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder={user.locale === 'ko' ? "오늘 주신 하나님의 음성을 기록하세요..." : "What is God saying to you today?"}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t.application}</label>
                <input 
                  value={application} onChange={e => setApplication(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={user.locale === 'ko' ? "어떻게 행동하시겠습니까?" : "How will you live it out?"}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t.prayer}</label>
                <input 
                  value={prayer} onChange={e => setPrayer(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={user.locale === 'ko' ? "짧은 소망의 기도..." : "A short prayer..."}
                />
              </div>

              <div className="space-y-2">
                 <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                        #{tag} <button onClick={() => removeTag(tag)} className="ml-1 text-blue-300">×</button>
                      </span>
                    ))}
                 </div>
                 <input 
                  value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTag()}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-xs outline-none"
                  placeholder={t.tags + " + Enter"}
                 />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <button 
                  onClick={requestAIHelp} disabled={isAIThinking}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isAIThinking ? 'bg-slate-100 text-slate-400' : 'text-amber-700 bg-amber-100 hover:bg-amber-200 shadow-sm shadow-amber-100'}`}
                >
                  <i className={`fa-solid fa-wand-magic-sparkles ${isAIThinking ? 'animate-spin' : ''}`}></i>
                  <span>{isAIThinking ? (user.locale === 'ko' ? 'AI 묵상 중...' : 'AI Thinking...') : t.aiHelp}</span>
                  {user.subscriptionStatus !== SubscriptionStatus.PREMIUM && <i className="fa-solid fa-lock text-[10px] ml-1"></i>}
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
                >
                  {t.save}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center italic">{t.aiDisclaimer}</p>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="p-5 space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{t.calendar}</h2>
            {renderCalendar()}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-5 space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-slate-800 tracking-tight">{t.stats}</h2>
             {user.subscriptionStatus === SubscriptionStatus.PREMIUM ? (
               <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
                      <p className="text-[10px] font-bold opacity-70 uppercase mb-1 tracking-widest">{t.streak}</p>
                      <h3 className="text-4xl font-black">{streakCount}<span className="text-xs ml-1 opacity-80 font-bold">{t.dayUnit}</span></h3>
                    </div>
                    <div className="bg-amber-400 rounded-3xl p-6 text-white shadow-xl shadow-amber-50">
                      <p className="text-[10px] font-bold opacity-70 uppercase mb-1 tracking-widest">{t.totalLogs}</p>
                      <h3 className="text-4xl font-black">{entries.length}<span className="text-xs ml-1 opacity-80 font-bold">{t.countUnit}</span></h3>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.recentTags}</h4>
                    <div className="flex flex-wrap gap-2">
                       {Array.from(new Set(entries.flatMap(e => e.tags))).slice(0, 10).map(tag => (
                         <span key={tag} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-100">#{tag}</span>
                       ))}
                       {entries.flatMap(e => e.tags).length === 0 && <p className="text-slate-300 text-xs italic">No tags used yet.</p>}
                    </div>
                  </div>
               </div>
             ) : (
               <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <i className="fa-solid fa-lock text-blue-500 text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 tracking-tight">{t.premiumOnly}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t.premiumPromo}</p>
                  </div>
                  <button 
                    onClick={() => setUser({...user, subscriptionStatus: SubscriptionStatus.PREMIUM})}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100"
                  >
                    Upgrade to Premium
                  </button>
               </div>
             )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-5 space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{t.settings}</h2>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
               <div className="p-5 flex justify-between items-center border-b border-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-globe"></i></div>
                    <span className="text-sm font-bold text-slate-700">{t.language}</span>
                  </div>
                  <select 
                    value={user.locale} onChange={e => setUser({...user, locale: e.target.value as Locale})}
                    className="bg-slate-50 text-xs font-bold rounded-lg border-none px-3 py-1 outline-none appearance-none"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
               </div>
               <div className="p-5 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-cloud"></i></div>
                    <span className="text-sm font-bold text-slate-700">{t.sync}</span>
                  </div>
                  <button className="text-xs font-black text-blue-600 uppercase tracking-tighter">{t.syncNow}</button>
               </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-2xl shadow-blue-200">
               <h3 className="font-bold mb-2">GraceLog Premium</h3>
               <p className="text-xs opacity-80 leading-relaxed mb-6">{t.premiumPromo}</p>
               <button 
                onClick={() => setUser({...user, subscriptionStatus: user.subscriptionStatus === SubscriptionStatus.FREE ? SubscriptionStatus.PREMIUM : SubscriptionStatus.FREE})}
                className="w-full bg-white text-blue-700 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
               >
                 {user.subscriptionStatus === SubscriptionStatus.PREMIUM ? t.switchFree : t.switchPremium}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t h-20 px-8 flex items-center justify-between z-50 rounded-t-[2.5rem] shadow-2xl">
        {[
          { id: 'home', icon: 'fa-solid fa-feather', label: t.home },
          { id: 'calendar', icon: 'fa-regular fa-calendar-check', label: t.calendar },
          { id: 'report', icon: 'fa-solid fa-chart-pie', label: t.report },
          { id: 'settings', icon: 'fa-solid fa-sliders', label: t.settings }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center space-y-1 transition-all ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-slate-300'}`}
          >
            <i className={`${item.icon} text-xl`}></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
