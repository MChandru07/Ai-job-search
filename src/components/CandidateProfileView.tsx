import React, { useRef, useState } from 'react';
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { INDIAN_CITIES, ROLE_CATEGORIES } from '../data/indianJobs';
import { CandidateProfile, IndianCity, NoticePeriod } from '../types/jobs';

interface CandidateProfileViewProps {
  profile: CandidateProfile;
  onSaveProfile: (next: CandidateProfile) => void;
  highMatchCount: number;
}

const NOTICE_OPTIONS: NoticePeriod[] = [
  'Immediate',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  profile,
  onSaveProfile,
  highMatchCount,
}) => {
  const [draft, setDraft] = useState<CandidateProfile>(profile);
  const [skillInput, setSkillInput] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedResume, setPastedResume] = useState(profile.rawResumeText ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = draft.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  const applyParsedFields = (
    extractedText: string,
    parsed: Partial<CandidateProfile> & { skills?: string[] },
    fileName: string
  ) => {
    const mergedSkills = Array.from(
      new Set([...(parsed.skills ?? []), ...draft.skills])
    ).slice(0, 22);

    const updated: CandidateProfile = {
      ...draft,
      fullName: parsed.fullName || draft.fullName,
      email: parsed.email || draft.email,
      phone: parsed.phone || draft.phone,
      currentCity: parsed.currentCity || draft.currentCity,
      targetRole: parsed.targetRole || draft.targetRole,
      experienceYears:
        typeof parsed.experienceYears === 'number'
          ? parsed.experienceYears
          : draft.experienceYears,
      currentLpa:
        typeof parsed.currentLpa === 'number'
          ? parsed.currentLpa
          : draft.currentLpa,
      expectedLpa:
        typeof parsed.expectedLpa === 'number'
          ? parsed.expectedLpa
          : draft.expectedLpa,
      noticePeriod: parsed.noticePeriod || draft.noticePeriod,
      skills: mergedSkills,
      portfolioUrl: parsed.portfolioUrl || draft.portfolioUrl,
      linkedInUrl: parsed.linkedInUrl || draft.linkedInUrl,
      resumeSummary: parsed.resumeSummary || draft.resumeSummary,
      resumeFileName: fileName,
      resumeUploadedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rawResumeText: extractedText,
    };

    setDraft(updated);
    setPastedResume(extractedText);
    onSaveProfile(updated);
    setResumeSuccess(
      `Parsed ${fileName}: extracted ${parsed.skills?.length ?? 0} skills and updated your role matches.`
    );
  };

  const handleResumeFile = async (file: File) => {
    setUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not parse resume.');
      }
      applyParsedFields(data.extractedText, data.parsedFields, file.name);
    } catch (err: unknown) {
      setResumeError(
        err instanceof Error ? err.message : 'Failed to parse resume file.'
      );
    } finally {
      setUploadingResume(false);
    }
  };

  const handleParsePastedText = async () => {
    if (!pastedResume.trim()) return;
    setUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);
    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'pasted-resume.txt',
          rawText: pastedResume,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not parse pasted resume.');
      }
      applyParsedFields(
        data.extractedText,
        data.parsedFields,
        'Pasted Resume Text'
      );
      setShowPasteBox(false);
    } catch (err: unknown) {
      setResumeError(
        err instanceof Error ? err.message : 'Failed to parse pasted resume.'
      );
    } finally {
      setUploadingResume(false);
    }
  };

  const handleRemoveAttachedResume = () => {
    const next: CandidateProfile = {
      ...draft,
      resumeFileName: undefined,
      resumeUploadedAt: undefined,
      rawResumeText: undefined,
    };
    setDraft(next);
    setPastedResume('');
    setResumeSuccess(null);
    onSaveProfile(next);
  };

  const handleAddSkill = () => {
    const clean = skillInput.trim();
    if (!clean) return;
    if (!draft.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      const next = { ...draft, skills: [...draft.skills, clean] };
      setDraft(next);
      onSaveProfile(next);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    const next = {
      ...draft,
      skills: draft.skills.filter((s) => s !== skill),
    };
    setDraft(next);
    onSaveProfile(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(draft);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Profile Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!avatarFailed && draft.avatarUrl ? (
            <img
              src={draft.avatarUrl}
              alt={`${draft.fullName} profile portrait`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shrink-0">
              {initials || 'BR'}
            </div>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Candidate & Resume Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 tabular-nums">
              Every role match score and auto-apply pitch uses this resume ·{' '}
              <span className="font-semibold text-emerald-700">
                {highMatchCount} roles at ≥ 75% match
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedToast && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Save Profile & Recalculate
          </button>
        </div>
      </section>

      {/* Resume Upload & Auto-Extraction Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Upload Resume (PDF, TXT, MD)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your resume or paste its text to auto-extract skills, notice period, ₹ LPA, city, and role matches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeFile(file);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setShowPasteBox((v) => !v)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {showPasteBox ? 'Hide Paste Box' : 'Paste Resume Text'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingResume}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {uploadingResume ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploadingResume ? 'Parsing Resume...' : 'Upload Resume File'}
            </button>
          </div>
        </div>

        {draft.resumeFileName && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  Attached: {draft.resumeFileName}
                </p>
                <p className="text-slate-500 font-mono tabular-nums">
                  Uploaded {draft.resumeUploadedAt || 'recently'} ·{' '}
                  {(draft.rawResumeText?.length ?? 0).toLocaleString()} characters indexed
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveAttachedResume}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        )}

        {showPasteBox && (
          <div className="space-y-3 pt-1">
            <textarea
              rows={6}
              value={pastedResume}
              onChange={(e) => setPastedResume(e.target.value)}
              placeholder="Paste your full resume text here (experience, skills, notice period, current/expected CTC, Bengaluru/Hyderabad/etc.)..."
              className="w-full p-3 text-xs font-mono leading-relaxed border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePastedText}
                disabled={uploadingResume || !pastedResume.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Extract & Auto-Fill Profile
              </button>
            </div>
          </div>
        )}

        {resumeError && (
          <p
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {resumeError}
          </p>
        )}

        {resumeSuccess && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {resumeSuccess}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Identity & Indian Compensation / Notice */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Contact & Indian Hiring Details
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prof-email" className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                id="prof-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-phone" className="block text-xs font-medium text-slate-700">
                Phone
              </label>
              <input
                id="prof-phone"
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="w-full h-10 px-3 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prof-city" className="block text-xs font-medium text-slate-700">
                Current City
              </label>
              <select
                id="prof-city"
                value={draft.currentCity}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    currentCity: e.target.value as Exclude<IndianCity, 'All India'>,
                  })
                }
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {INDIAN_CITIES.filter((c) => c !== 'All India').map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-exp" className="block text-xs font-medium text-slate-700">
                Experience (Years)
              </label>
              <input
                id="prof-exp"
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={draft.experienceYears}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    experienceYears: Number(e.target.value),
                  })
                }
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prof-cur-lpa" className="block text-xs font-medium text-slate-700">
                Current CTC (₹ LPA)
              </label>
              <input
                id="prof-cur-lpa"
                type="number"
                min={0}
                max={200}
                value={draft.currentLpa}
                onChange={(e) =>
                  setDraft({ ...draft, currentLpa: Number(e.target.value) })
                }
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-exp-lpa" className="block text-xs font-medium text-slate-700">
                Expected CTC (₹ LPA)
              </label>
              <input
                id="prof-exp-lpa"
                type="number"
                min={0}
                max={250}
                value={draft.expectedLpa}
                onChange={(e) =>
                  setDraft({ ...draft, expectedLpa: Number(e.target.value) })
                }
                className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prof-notice" className="block text-xs font-medium text-slate-700">
              Official Notice Period
            </label>
            <select
              id="prof-notice"
              value={draft.noticePeriod}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  noticePeriod: e.target.value as NoticePeriod,
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {NOTICE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.buyoutAvailable}
              onChange={(e) =>
                setDraft({ ...draft, buyoutAvailable: e.target.checked })
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-700">
              Early joining / notice buyout negotiable
            </span>
          </label>
        </section>

        {/* Right column: Target Role, Skills & Resume Summary */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Target Role, Skills & Resume Summary
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="prof-role" className="block text-xs font-medium text-slate-700">
              Primary Target Role
            </label>
            <select
              id="prof-role"
              value={draft.targetRole}
              onChange={(e) => setDraft({ ...draft, targetRole: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {ROLE_CATEGORIES.filter((r) => r !== 'All Roles').map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="prof-skill-input" className="block text-xs font-medium text-slate-700">
              Core Skills ({draft.skills.length})
            </label>
            <div className="flex items-center gap-2">
              <input
                id="prof-skill-input"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add skill (e.g. Kubernetes, Go, Kafka, Python)..."
                className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 h-10 px-3.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {draft.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prof-github" className="block text-xs font-medium text-slate-700">
                GitHub / Portfolio URL
              </label>
              <input
                id="prof-github"
                type="url"
                value={draft.portfolioUrl}
                onChange={(e) =>
                  setDraft({ ...draft, portfolioUrl: e.target.value })
                }
                className="w-full h-10 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-linkedin" className="block text-xs font-medium text-slate-700">
                LinkedIn India URL
              </label>
              <input
                id="prof-linkedin"
                type="url"
                value={draft.linkedInUrl}
                onChange={(e) =>
                  setDraft({ ...draft, linkedInUrl: e.target.value })
                }
                className="w-full h-10 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prof-summary" className="block text-xs font-medium text-slate-700">
              Resume Summary & Key Achievements
            </label>
            <textarea
              id="prof-summary"
              rows={5}
              value={draft.resumeSummary}
              onChange={(e) =>
                setDraft({ ...draft, resumeSummary: e.target.value })
              }
              className="w-full p-3 text-sm leading-relaxed border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </section>
      </div>
    </form>
  );
};
