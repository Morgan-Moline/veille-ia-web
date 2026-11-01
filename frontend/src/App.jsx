import React, { useCallback, useEffect, useMemo, useState } from 'react';
import questionBank from './data/questionBank.json';
import {
  Activity, ArrowDownUp, ArrowUpRight, BookOpen, Bookmark, BookmarkCheck,
  Calculator, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Cloud,
  CloudCog, GraduationCap, LayoutGrid, LoaderCircle, Menu, Newspaper,
  RefreshCw, Search, Settings2, Sparkles, Sprout, Star, Tractor, X,
  Eye, EyeOff, Filter, ExternalLink, ChartNoAxesCombined, CalendarDays
} from 'lucide-react';

const DATA_URL = 'https://raw.githubusercontent.com/Morgan-Moline/veille-ia-data/main/data.json';
const categories = [
  { name: 'Comptabilité & fiscalité', short: 'Comptabilité', desc: 'TVA, fiscalité et actualités comptables', accent: '#9b5cff', secondary: '#ff4fd8', icon: Calculator, image: `${import.meta.env.BASE_URL}images/comptabilite.png`, eyebrow: 'COMPTABILITÉ • FISCALITÉ' },
  { name: 'BTS Comptabilité-Gestion', short: 'Études', desc: 'Cours, examens et ressources BTS CG', accent: '#174a91', secondary: '#55a6e8', icon: GraduationCap, image: `${import.meta.env.BASE_URL}images/etudes.png`, eyebrow: 'CCI CAMPUS CENTRE' },
  { name: 'Secteur professionnel', short: 'Secteur pro', desc: 'Matériel agricole, concessionnaires et location', accent: '#c62828', secondary: '#ef5350', icon: Tractor, image: `${import.meta.env.BASE_URL}images/secteur_pro.png`, eyebrow: 'CLOUÉ • CASE IH' }
];
const filters = [
  { id: 'Tous', label: 'Tous les articles', icon: LayoutGrid },
  { id: 'Non lus', label: 'Non lus', icon: EyeOff },
  { id: 'Favoris', label: 'Favoris', icon: Star },
  { id: 'Lus', label: 'Déjà lus', icon: Eye }
];
function readStore(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function cleanText(value = '') { return String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
function dateLabel(value) { if (!value) return 'Date non disponible'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Date non disponible' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d); }
function relativeDate(value) { if (!value) return ''; const d = new Date(value); const days = Math.floor((Date.now() - d.getTime()) / 86400000); if (!Number.isFinite(days)) return ''; if (days <= 0) return "Aujourd’hui"; if (days === 1) return 'Hier'; if (days < 7) return `Il y a ${days} jours`; return dateLabel(value); }
function categoryFor(name) { return categories.find(c => c.name === name) || { ...categories[0], short: name || 'Actualité' }; }

export default function App() {
  const [articles, setArticles] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [selectedFilter, setSelectedFilter] = useState('Tous');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => readStore('veille-favorites'));
  const [read, setRead] = useState(() => readStore('veille-read'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [watchInProgress, setWatchInProgress] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState('');
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizSetupOpen, setQuizSetupOpen] = useState(false);
  const [quizSelectedTopics, setQuizSelectedTopics] = useState(() => Object.keys(questionBank.topics));
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);

  const loadArticles = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const response = await fetch(`${DATA_URL}?refresh=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Réponse ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.articles)) throw new Error('Format de données inattendu');
      const unique = new Map();
      payload.articles.forEach(raw => {
        const link = String(raw.link || '').trim();
        if (!link) return;
        unique.set(link, { ...raw, title: cleanText(raw.title), description: cleanText(raw.description), summary: cleanText(raw.summary), link });
      });
      const sorted = [...unique.values()].sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
      setArticles(sorted);
      setUpdatedAt(payload.updated_at || null);
      setLastRefresh(new Date());
    } catch (e) { setError('Impossible de récupérer les actualités depuis GitHub. Vérifie ta connexion puis réessaie.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { localStorage.setItem('veille-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('veille-read', JSON.stringify(read)); }, [read]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr');
    return articles.filter(a => {
      const categoryMatch = selectedCategory === 'Toutes' || a.category === selectedCategory;
      const filterMatch = selectedFilter === 'Favoris' ? favorites.includes(a.link) : selectedFilter === 'Non lus' ? !read.includes(a.link) : selectedFilter === 'Lus' ? read.includes(a.link) : true;
      const searchMatch = !q || [a.title, a.description, a.summary, a.source, a.category].join(' ').toLocaleLowerCase('fr').includes(q);
      return categoryMatch && filterMatch && searchMatch;
    }).sort((a, b) => sortNewest ? new Date(b.published_at || 0) - new Date(a.published_at || 0) : new Date(a.published_at || 0) - new Date(b.published_at || 0));
  }, [articles, selectedCategory, selectedFilter, favorites, read, search, sortNewest]);

  const currentCategory = categories.find(c => c.name === selectedCategory);
  const accent = currentCategory?.accent || '#176b5b';
  const unreadCount = articles.filter(a => !read.includes(a.link)).length;
  const toggle = (value, setter, link) => setter(old => old.includes(link) ? old.filter(x => x !== link) : [...old, link]);
  const openArticle = (article) => {
    if (!read.includes(article.link)) setRead(old => [...old, article.link]);
    window.open(article.link, '_blank', 'noopener,noreferrer');
  };

  async function launchNewWatch() {
    if (!secret.trim() || triggering || watchInProgress) return;
    setTriggering(true);
    setTriggerMessage('Envoi de la demande…');
    const before = updatedAt;
    try {
      const response = await fetch('https://veille-ia-trigger.themomo450.workers.dev/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret.trim()}`, 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (response.status === 401) throw new Error('Secret incorrect.');
      if (response.status !== 202) throw new Error(`Le lancement a échoué (${response.status}).`);

      // Le Worker continue son travail côté serveur : on libère immédiatement l'interface.
      setTriggerMessage('Veille lancée en arrière-plan. Tu peux continuer à utiliser le site.');
      setTriggering(false);
      setWatchInProgress(true);

      // Le suivi est indépendant de l'interface : il ne bloque ni la navigation ni les filtres.
      void (async () => {
        const deadline = Date.now() + 8 * 60 * 1000;
        let changed = false;
        while (Date.now() < deadline) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          try {
            const check = await fetch(`${DATA_URL}?refresh=${Date.now()}`, { cache: 'no-store' });
            if (!check.ok) continue;
            const json = await check.json();
            if (json.updated_at && new Date(json.updated_at) > new Date(before || 0)) {
              changed = true;
              break;
            }
          } catch { /* Le suivi réessaie au prochain passage. */ }
        }
        if (changed) {
          await loadArticles(true);
          setTriggerMessage('Nouvelle veille récupérée !');
        } else {
          setTriggerMessage('La génération continue peut-être côté serveur. Tu peux actualiser les articles plus tard.');
        }
        setWatchInProgress(false);
      })();
    } catch (e) {
      setTriggerMessage(e.message || 'Une erreur est survenue.');
    } finally {
      setTriggering(false);
    }
  }

  const nextQuiz = () => {
    if (quizIndex + 1 >= quizQuestions.length) { setQuizDone(true); return; }
    setQuizIndex(i => i + 1); setQuizAnswer(null);
  };
  const openQuizSetup = () => {
    setQuizSelectedTopics(Object.keys(questionBank.topics));
    setQuizSetupOpen(true);
    setQuizOpen(true);
  };
  const startQuiz = (topics = quizSelectedTopics) => {
    const session = Object.entries(questionBank.topics)
      .filter(([topic]) => topics.includes(topic))
      .map(([topic, questions]) => {
        const item = questions[Math.floor(Math.random() * questions.length)];
        return { topic, q: item.question, a: item.answers, correct: item.correctAnswer, why: item.explanation, difficulty: item.difficulty || 'intermediaire' };
      }).sort(() => Math.random() - 0.5);
    if (!session.length) return;
    setQuizQuestions(session); setQuizIndex(0); setQuizAnswer(null); setQuizScore(0);
    setQuizDone(false); setQuizSetupOpen(false); setQuizOpen(true);
  };

  return <div className="app-shell" style={{ '--accent': accent, '--accent-secondary': currentCategory?.secondary || '#f28c28' }}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>Veille<span>IA</span></strong><small>Votre veille, au bon endroit</small></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="side-label">ESPACE DE TRAVAIL</div>
      <button className={`nav-item ${selectedCategory === 'Toutes' && selectedFilter === 'Tous' ? 'active' : ''}`} onClick={() => {setSelectedCategory('Toutes');setSelectedFilter('Tous');setMobileNav(false);}}><LayoutGrid size={18}/>Vue d’ensemble</button>
      <div className="side-label side-label-spaced">MES THÈMES</div>
      {categories.map(c => <button key={c.name} className={`nav-item ${selectedCategory === c.name ? 'active' : ''}`} onClick={() => {setSelectedCategory(c.name);setSelectedFilter('Tous');setMobileNav(false);}}><span className="nav-dot" style={{background:c.accent}}/><span>{c.short}</span></button>)}
      <div className="side-label side-label-spaced">MA BIBLIOTHÈQUE</div>
      {filters.slice(1).map(f => <button key={f.id} className={`nav-item ${selectedFilter === f.id ? 'active' : ''}`} onClick={() => {setSelectedFilter(f.id);setSelectedCategory('Toutes');setMobileNav(false);}}><f.icon size={18}/><span>{f.label}</span>{f.id === 'Non lus' && <span className="nav-count">{unreadCount}</span>}</button>)}
      <div className="sidebar-spacer"/>
      <div className="sidebar-note"><div className="note-icon"><Activity size={17}/></div><strong>Votre veille évolue</strong><p>Les articles et résumés sont actualisés automatiquement.</p><span><span className="status-dot"/> Source synchronisée</span></div>
      <div className="profile-row"><div className="avatar">M</div><div><strong>Morgan</strong><small>Veille personnelle</small></div><Settings2 size={17} className="profile-settings"/></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Fermer le menu"/>}

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Veille IA <span>/</span> <strong>{selectedCategory === 'Toutes' ? 'Vue d’ensemble' : currentCategory?.short}</strong></div></div><div className="top-actions"><div className="sync-label"><span className="status-dot"/> Données synchronisées</div><button className="top-btn" onClick={openQuizSetup}><GraduationCap size={17}/><span>Mode révision</span></button><button className="top-btn" onClick={() => loadArticles()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/><span>Actualiser</span></button><button className="primary-btn" onClick={() => {setTriggerMessage('');setSecret('');setTriggerOpen(true);}}><CloudCog size={17}/><span>Nouvelle veille</span></button></div></header>

      <div className="content-wrap">
        <section className={`hero ${selectedCategory === 'Toutes' ? 'hero-all' : ''}`} style={{'--hero-accent': accent, '--hero-secondary': currentCategory?.secondary || '#55a6e8'}}>
          <div className="hero-photo" style={selectedCategory === 'Toutes' ? {} : {backgroundImage:`url(${currentCategory.image})`}}/>
          {selectedCategory === 'Toutes' && <div className="hero-triptych">{categories.map(c=><div key={c.name} style={{backgroundImage:`url(${c.image})`,backgroundColor:c.accent}}/>)}</div>}
          <div className="hero-overlay"/>
          <div className="hero-content"><div className="hero-kicker"><span className="kicker-line"/>{currentCategory?.eyebrow || 'COMPTABILITÉ • ÉTUDES • CLOUÉ'}</div><div className="hero-title-row"><div><h1>{selectedCategory === 'Toutes' ? <>L’essentiel de votre<br/><em>veille professionnelle.</em></> : <>{currentCategory?.short}<br/><em>en un coup d’œil.</em></>}</h1><p>{selectedCategory === 'Toutes' ? 'Comptabilité, formation et actualités de votre secteur : tout est réuni au même endroit.' : currentCategory?.desc}</p></div><div className="hero-symbol">{currentCategory ? <currentCategory.icon size={35}/> : <Sparkles size={35}/>}</div></div><div className="hero-bottom"><span className="hero-chip"><Sparkles size={14}/> Veille enrichie par l’IA</span><span className="hero-chip"><Newspaper size={14}/> {articles.length} articles disponibles</span></div></div>
          <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
        </section>

        <section className="stats-row">
          <div className="stat-card"><div className="stat-icon blue"><Newspaper size={19}/></div><div><small>Articles disponibles</small><strong>{articles.length}</strong></div></div>
          <div className="stat-card"><div className="stat-icon orange"><EyeOff size={19}/></div><div><small>À découvrir</small><strong>{unreadCount}</strong></div></div>
          <div className="stat-card"><div className="stat-icon gold"><Star size={19}/></div><div><small>Mes favoris</small><strong>{favorites.length}</strong></div></div>
          <div className="stat-card stat-updated"><div className="stat-icon green"><Clock3 size={19}/></div><div><small>Dernière veille publiée</small><strong>{updatedAt ? dateLabel(updatedAt) : 'En attente'}</strong></div></div>
        </section>

        <section className="themes-section"><div className="section-heading"><div><div className="eyebrow">PERSONNALISER MON FLUX</div><h2>Mes thèmes de veille</h2><p>Choisissez un univers pour retrouver les informations qui comptent.</p></div><button className="text-action" onClick={() => {setSelectedCategory('Toutes');setSelectedFilter('Tous');}}>Tout afficher <ArrowUpRight size={16}/></button></div>
          <div className="theme-grid"><button className={`theme-card theme-all ${selectedCategory === 'Toutes' ? 'selected' : ''}`} onClick={() => setSelectedCategory('Toutes')}><div className="theme-icon all-icon"><LayoutGrid size={20}/></div><div><strong>Tous les thèmes</strong><small>Vue globale de votre veille</small></div><span className="theme-count">{articles.length}</span></button>{categories.map(c=>{const count=articles.filter(a=>a.category===c.name).length;return <button key={c.name} className={`theme-card ${selectedCategory===c.name?'selected':''}`} onClick={()=>setSelectedCategory(c.name)} style={{'--theme-accent':c.accent}}><div className="theme-icon"><c.icon size={20}/></div><div><strong>{c.short}</strong><small>{c.desc}</small></div><span className="theme-count">{count}</span></button>})}</div>
        </section>

        <section className="news-section"><div className="section-heading news-heading"><div><div className="eyebrow">VOTRE SÉLECTION</div><h2>Actualités récentes</h2><p>Une sélection d’informations avec leur résumé IA pour aller à l’essentiel.</p></div><div className="news-meta"><span className="result-count">{visible.length} résultat{visible.length>1?'s':''}</span><button className="sort-btn" onClick={()=>setSortNewest(v=>!v)}><ArrowDownUp size={15}/>{sortNewest?'Plus récentes':'Plus anciennes'}</button></div></div>
          <div className="toolbar"><div className="filter-tabs">{filters.map(f=><button key={f.id} className={selectedFilter===f.id?'tab-active':''} onClick={()=>setSelectedFilter(f.id)}><f.icon size={15}/>{f.id}</button>)}</div><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un article, une source…"/><kbd>⌘ K</kbd>{search&&<button className="clear-search" onClick={()=>setSearch('')}><X size={14}/></button>}</label></div>
          {loading && articles.length===0 ? <div className="empty-state"><LoaderCircle className="spin" size={30}/><strong>Récupération de votre veille…</strong><p>Les dernières actualités arrivent.</p></div> : error && articles.length===0 ? <div className="empty-state"><Cloud size={30}/><strong>Veille momentanément indisponible</strong><p>{error}</p><button className="primary-btn" onClick={()=>loadArticles()}><RefreshCw size={16}/> Réessayer</button></div> : visible.length===0 ? <div className="empty-state"><Search size={30}/><strong>Aucun article trouvé</strong><p>Essayez un autre thème ou modifiez votre recherche.</p><button className="secondary-btn" onClick={()=>{setSearch('');setSelectedFilter('Tous');setSelectedCategory('Toutes');}}>Réinitialiser les filtres</button></div> : <div className="article-grid">{visible.map((article,i)=>{const c=categoryFor(article.category);const isFavorite=favorites.includes(article.link);const isRead=read.includes(article.link);return <article key={article.link} className={`article-card ${isRead?'article-read':''}`} style={{'--card-accent':c.accent,'--card-secondary':c.secondary,'--delay':`${Math.min(i,10)*35}ms`}}><div className="article-topline"><span className="article-category"><i/>{c.short}</span><span className="article-date"><CalendarDays size={13}/>{relativeDate(article.published_at)}</span></div><button className="article-title" onClick={()=>openArticle(article)}>{article.title}</button>{article.description&&<p className="article-description">{article.description}</p>}
              <div className="summary-box">{article.summary?<><div className="summary-heading"><span><Sparkles size={15}/> Résumé IA</span><span className="ai-tag">IA</span></div><p>{article.summary}</p></>:<div className="summary-pending"><Sparkles size={16}/><span>Résumé IA en attente. Il sera ajouté lors d’une prochaine actualisation.</span></div>}</div>
              <div className="article-footer"><div className="source"><span className="source-mark">{(article.source||'G').slice(0,1).toUpperCase()}</span><span title={article.source}>{article.source||'Google Actualités'}</span></div><div className="article-actions"><button className={`mini-action ${isFavorite?'is-favorite':''}`} title={isFavorite?'Retirer des favoris':'Ajouter aux favoris'} onClick={()=>toggle(article.link,setFavorites,article.link)}>{isFavorite?<BookmarkCheck size={17}/>:<Bookmark size={17}/>}</button><button className={`read-action ${isRead?'read-done':''}`} onClick={()=>toggle(article.link,setRead,article.link)}>{isRead?<Check size={14}/>:<Eye size={14}/>} {isRead?'Lu':'Non lu'}</button><button className="read-link" onClick={()=>openArticle(article)}>Lire <ExternalLink size={14}/></button></div></div>
            </article>})}</div>}
          {error && articles.length>0 && <div className="inline-error">{error}</div>}
          <div className="disclaimer"><Sparkles size={15}/><span>Les résumés sont générés par Gemini lors de l’actualisation automatique de la veille. Vérifiez toujours les informations importantes auprès de la source originale.</span></div>
        </section>
        <footer className="footer"><span>Veille IA <b>•</b> Un regard clair sur ce qui compte.</span><span>{lastRefresh?`Données consultées à ${new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(lastRefresh)}`:'Prêt à synchroniser'}</span></footer>
      </div>
    </main>

    {triggerOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!triggering)setTriggerOpen(false);}}><div className="modal"><button className="modal-close" onClick={()=>!triggering&&setTriggerOpen(false)}><X size={18}/></button><div className="modal-icon"><CloudCog size={23}/></div><div className="eyebrow">AUTOMATISATION</div><h2>Lancer une nouvelle veille</h2><p>Déclenchez la collecte et la génération des résumés IA. Le site attendra automatiquement la publication des nouveaux articles.</p><label className="field-label" htmlFor="app-secret">Secret d’accès</label><input id="app-secret" className="modal-input" type="password" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="APP_SECRET" autoFocus disabled={triggering}/>{triggerMessage&&<div className={`trigger-message ${triggerMessage.includes('récupérée')?'success':''}`}>{triggering&&<LoaderCircle size={15} className="spin"/>}{triggerMessage}</div>}<div className="modal-actions"><button className="secondary-btn" onClick={()=>setTriggerOpen(false)} disabled={triggering}>Fermer</button><button className="primary-btn" onClick={launchNewWatch} disabled={triggering||watchInProgress||!secret.trim()}>{triggering?<LoaderCircle size={16} className="spin"/>:<CloudCog size={16}/>} {triggering?'Envoi…':watchInProgress?'Veille en arrière-plan…':'Lancer la veille'}</button></div><small className="privacy-note">Le secret est transmis au service de déclenchement et n’est pas enregistré dans le navigateur.</small></div></div>}

    {quizOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setQuizOpen(false);}}><div className="modal quiz-modal"><button className="modal-close" onClick={()=>setQuizOpen(false)}><X size={18}/></button><div className="modal-icon quiz-icon"><GraduationCap size={24}/></div><div className="eyebrow">ENTRAÎNEMENT BTS CG</div><div className="quiz-bank-meta">500 questions disponibles · 10 thèmes</div>{quizSetupOpen?<><div className="quiz-bank-meta">500 questions disponibles · Choisis les thèmes à travailler. Une question sera tirée au sort dans chaque thème sélectionné.</div><h2>Sur quels thèmes veux-tu réviser ?</h2><div className="quiz-topic-picker"><div className="quiz-topic-picker-actions"><button type="button" onClick={()=>setQuizSelectedTopics(Object.keys(questionBank.topics))}>Tout sélectionner</button><button type="button" onClick={()=>setQuizSelectedTopics([])}>Tout désélectionner</button></div>{Object.entries(questionBank.topics).map(([topic,questions])=><label className="quiz-topic-option" key={topic}><input type="checkbox" checked={quizSelectedTopics.includes(topic)} onChange={e=>setQuizSelectedTopics(current=>e.target.checked?[...current,topic]:current.filter(item=>item!==topic))}/><span><strong>{topic}</strong><small>{questions.length} questions</small></span></label>)}</div><div className="modal-actions"><span className="score-label">{quizSelectedTopics.length} thème(s) sélectionné(s)</span><button className="primary-btn" disabled={!quizSelectedTopics.length} onClick={()=>startQuiz()}>Commencer <ArrowUpRight size={15}/></button></div></>:quizDone?<><h2>Session terminée !</h2><p>Vous avez obtenu <strong>{quizScore} / {quizQuestions.length}</strong>. Continuez à vous entraîner pour consolider vos acquis.</p><div className="score-ring"><strong>{Math.round(quizScore/quizQuestions.length*100)}%</strong><span>de réussite</span></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setQuizOpen(false)}>Fermer</button><button className="primary-btn" onClick={openQuizSetup}>Recommencer</button></div></>:<><div className="quiz-progress"><span>Question {quizIndex+1} / {quizQuestions.length}</span><div><i style={{width:`${(quizIndex+1)/quizQuestions.length*100}%`}}/></div></div><span className="quiz-topic">{quizQuestions[quizIndex].topic}</span><h2>{quizQuestions[quizIndex].q}</h2><div className="quiz-answers">{quizQuestions[quizIndex].a.map((a,i)=><button key={a} disabled={quizAnswer!==null} className={`${quizAnswer===i?'chosen':''} ${quizAnswer!==null&&i===quizQuestions[quizIndex].correct?'correct':''} ${quizAnswer===i&&i!==quizQuestions[quizIndex].correct?'incorrect':''}`} onClick={()=>{setQuizAnswer(i);if(i===quizQuestions[quizIndex].correct)setQuizScore(s=>s+1);}}><span>{String.fromCharCode(65+i)}</span>{a}{quizAnswer!==null&&i===quizQuestions[quizIndex].correct&&<Check size={17}/>}</button>)}</div>{quizAnswer!==null&&<div className={`quiz-explanation ${quizAnswer===quizQuestions[quizIndex].correct?'good':''}`}><strong>{quizAnswer===quizQuestions[quizIndex].correct?'Bonne réponse !':'Pas tout à fait.'}</strong><p>{quizQuestions[quizIndex].why}</p></div>}<div className="modal-actions"><span className="score-label">Score : {quizScore}</span><button className="primary-btn" disabled={quizAnswer===null} onClick={nextQuiz}>{quizIndex===quizQuestions.length-1?'Voir le résultat':'Question suivante'} <ArrowUpRight size={15}/></button></div></>}</div></div>}
  </div>;
}
