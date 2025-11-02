// pages/index.tsx
import { useState, useMemo } from 'react';
import Head from 'next/head';
import { runExpertSystem, DiagnosisResult } from '../lib/inference-engine';
import { rulesData } from '../lib/rules';

interface Question {
  id: string;
  question: string;
  cf: number;
}

export default function Home() {
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [results, setResults] = useState<DiagnosisResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pageSize = 6;

  const questions = useMemo<Question[]>(() => {
    return Object.entries(rulesData.facts).map(([key, fact]) => ({
      id: key,
      question: fact.question,
      cf: fact.cf
    }));
  }, []);

  // Initialize all answers to Ragu (0.5 * cf) by default
  useMemo(() => {
    const initialAnswers: Record<string, number> = {};
    for (const q of questions) {
      initialAnswers[q.id] = q.cf * 0.5;
    }
    setUserAnswers(initialAnswers);
  }, [questions]);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, questions.length);
  const currentQuestions = questions.slice(start, end);

  const handleSliderChange = (questionId: string, value: string) => {
    const q = questions.find(x => x.id === questionId);
    if (!q) return;

    let answerCF = q.cf * 0.5; // default ragu
    if (value === '1') {
      answerCF = q.cf; // Ya
    } else if (value === '0') {
      answerCF = 0; // Tidak
    }

    setUserAnswers(prev => ({ ...prev, [questionId]: answerCF }));
  };

  const getSliderValue = (questionId: string): number => {
    const q = questions.find(x => x.id === questionId);
    if (!q) return 0.5;

    const saved = userAnswers[questionId];
    if (saved === undefined) return 0.5;
    if (saved <= 0) return 0;
    if (Math.abs(saved - q.cf) < 1e-9) return 1;
    return 0.5;
  };

  const getChipLabel = (questionId: string): string => {
    const val = getSliderValue(questionId);
    if (val === 1) return 'Ya';
    if (val === 0) return 'Tidak';
    return 'Ragu';
  };

  const getChipClass = (questionId: string): string => {
    const val = getSliderValue(questionId);
    if (val === 1) return 'status-chip yes';
    if (val === 0) return 'status-chip no';
    return 'status-chip maybe';
  };

  const countFilledForPage = (page: number): number => {
    const pageStart = (page - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, questions.length);
    let count = 0;
    for (let i = pageStart; i < pageEnd; i++) {
      const q = questions[i];
      const v = userAnswers[q.id];
      if (v === 0 || Math.abs(v - q.cf) < 1e-9) count++;
    }
    return count;
  };

  const setAllYes = () => {
    const updates: Record<string, number> = {};
    for (let i = start; i < end; i++) {
      const q = questions[i];
      updates[q.id] = q.cf;
    }
    setUserAnswers(prev => ({ ...prev, ...updates }));
  };

  const setAllRagu = () => {
    const updates: Record<string, number> = {};
    for (let i = start; i < end; i++) {
      const q = questions[i];
      updates[q.id] = q.cf * 0.5;
    }
    setUserAnswers(prev => ({ ...prev, ...updates }));
  };

  const clearSession = () => {
    const updates: Record<string, number> = {};
    for (let i = start; i < end; i++) {
      const q = questions[i];
      updates[q.id] = 0;
    }
    setUserAnswers(prev => ({ ...prev, ...updates }));
  };

  const processDiagnosis = () => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const diagnosisResults = runExpertSystem(userAnswers, rulesData);
        setResults(diagnosisResults);
      } catch (error) {
        console.error('Error in diagnosis:', error);
        setResults([]);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const resetDiagnosis = () => {
    const initialAnswers: Record<string, number> = {};
    for (const q of questions) {
      initialAnswers[q.id] = q.cf * 0.5;
    }
    setUserAnswers(initialAnswers);
    setResults(null);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>Sistem Pakar Penyakit Padi</title>
        <meta name="description" content="Sistem pakar untuk mendiagnosa penyakit pada tanaman padi" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <header>
          <h1>Sistem Pakar Penyakit Padi</h1>
          <p>Pilih gejala yang sesuai dengan kondisi tanaman padi Anda</p>
        </header>

        <div className="question-form">
          {/* Session Progress Pills */}
          <div className="session-progress">
            <div className="session-progress-title">Progress Sesi</div>
            <div className="session-pills">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                const filled = countFilledForPage(page);
                const cls = page === currentPage ? 'pill active' : (filled > 0 ? 'pill done' : 'pill');
                return (
                  <button
                    key={page}
                    type="button"
                    className={cls}
                    onClick={() => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-label={`Buka sesi ${page}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar-row">
            <div className="toolbar-left">
              Sesi {currentPage} · <span className="muted">{countFilledForPage(currentPage)} gejala terisi</span>
            </div>
            <div className="toolbar-right">
              <button type="button" className="chip-btn" onClick={setAllYes}>
                Iya Semua
              </button>
              <button type="button" className="chip-btn" onClick={setAllRagu}>
                Semua Ragu
              </button>
              <button type="button" className="chip-btn" onClick={clearSession}>
                Bersihkan
              </button>
            </div>
          </div>

          {/* Question Grid */}
          <div className="question-grid">
            {currentQuestions.map((q, idx) => (
              <div key={q.id} className="question-card" data-id={q.id}>
                <div className="card-head">
                  <h4 className="card-title">
                    <span className="question-number">{start + idx + 1}.</span> {q.question}
                  </h4>
                  <span className={getChipClass(q.id)}>{getChipLabel(q.id)}</span>
                </div>
                <div className="yn-slider">
                  <input
                    id={`slider-${q.id}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.5"
                    value={getSliderValue(q.id)}
                    onChange={(e) => handleSliderChange(q.id, e.target.value)}
                    aria-label="Jawaban Tidak/Ragu/Ya"
                  />
                  <div className="slider-labels">
                    <span>Tidak</span>
                    <span>Ragu</span>
                    <span>Ya</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pager">
            <div className="pager-info">
              Sesi {currentPage} dari {totalPages}
            </div>
            <div className="pager-buttons">
              <button
                type="button"
                className="pager-btn"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(currentPage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Sesi Sebelumnya
              </button>
              {currentPage < totalPages ? (
                <button
                  type="button"
                  className="pager-btn primary"
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Lanjut ke Sesi Berikutnya
                </button>
              ) : (
                <button
                  type="button"
                  className="submit-btn"
                  onClick={processDiagnosis}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Proses Diagnosa'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {results !== null && (
          <div id="hasil">
            {results.length === 0 ? (
              <div className="result">
                <strong>Tidak ada penyakit terdeteksi</strong>
                <em>Berdasarkan gejala yang dipilih, tidak ditemukan penyakit yang sesuai.</em>
              </div>
            ) : (
              <>
                <h2>Hasil Diagnosa</h2>
                <div className="results-container">
                  {results.slice(0, 3).map((r, idx) => {
                    const cfPct = (r.cf * 100).toFixed(1);
                    return (
                      <div key={r.id} className="result">
                        <div className="result-header">
                          <span className="result-rank">{idx + 1}</span>
                          <h3>{r.penyakit}</h3>
                          <span className="confidence-badge">{cfPct}%</span>
                        </div>
                        <div className="result-body">
                          <p>{r.note || ''}</p>
                          <div className="confidence-meter">
                            <div className="confidence-fill" style={{ width: `${cfPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={resetDiagnosis} className="reset-btn">
                  Lakukan Diagnosa Kembali
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
