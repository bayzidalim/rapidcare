'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardList,
  Factory,
  Info,
  Lightbulb,
  Loader2,
  Pill,
  Sparkles,
  Stethoscope,
  Languages,
} from 'lucide-react';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import type { User } from '@/lib/types';
import {
  getAllRapidAnalyzeGenerics,
  getRapidAnalyzeDataset,
  searchRapidAnalyze,
  type RapidAnalyzeGroup,
  type RapidAnalyzeSearchResult,
} from '@/lib/rapidAnalyze';
import { cn } from '@/lib/utils';

type AccessStatus = 'checking' | 'redirecting' | 'ready' | 'denied';

const DATASET_METADATA = getRapidAnalyzeDataset().metadata;

const QUICK_PICK_COUNT = 8;

type Language = 'en' | 'bn';

const translations = {
  en: {
    pageTitle: 'Rapid Analyze',
    tagline:
      'Discover medicines that share the same generic ingredient, understand why your doctor selected them, and review safe-use guidance tailored to each brand.',
    datasetVersionLabel: 'Dataset version',
    updatedOnLabel: 'Updated on',
    searchCardTitle: 'Search by generic or brand name',
    searchCardDescription:
      'Type a medicine name from your prescription to explore equivalent brands and usage insights.',
    searchPlaceholder: 'e.g. Paracetamol, Napa, Esomeprazole',
    analyzeButton: 'Analyze',
    relatedLabel: 'Related:',
    safeUseTitle: 'Safe-use reminder',
    safeUseDescription:
      "Rapid Analyze is informational only. Always follow your doctor's dosing instructions and consult them before switching between brands.",
    safeUseNote: 'Keep your prescription handy to verify strengths and dosing schedules.',
    quickPickHeading: 'Quick generic picks',
    matchTypeLabels: {
      brand: 'Brand match found',
      generic: 'Generic match',
      partial: 'Showing relevant matches',
      none: '',
    },
    genericIngredientLabel: 'Generic ingredient',
    brandSearchedLabel: 'Brand searched',
    howItHelps: 'How it helps',
    whyDoctorsPrescribe: 'Why doctors prescribe it',
    guidanceToFollow: 'Guidance to follow',
    fromYourSearch: 'From your search',
    whyItsChosen: "Why it's chosen",
    primaryBenefits: 'Primary benefits',
    patientGuidance: 'Patient guidance',
    commonStrengths: 'Common strengths',
    dosageForms: 'Dosage forms',
    noMatchesTitle: 'No exact matches yet',
    noMatchesDescription:
      'Try the full generic name (e.g., "Paracetamol") or select a suggestion below.',
    defaultIntroTitle: 'How Rapid Analyze helps',
    defaultIntroDescription:
      'Enter a medicine from your prescription to uncover other brands sharing the same generic, plus clear guidance on why and how they are used.',
    helperMatchGenericsTitle: 'Match generics',
    helperMatchGenericsDescription:
      'See every brand that uses the same active ingredient as your medicine.',
    helperDoctorInsightTitle: 'Doctor insight',
    helperDoctorInsightDescription:
      'Understand the clinical reasons your doctor prefers a specific brand.',
    helperSmartGuidanceTitle: 'Smart guidance',
    helperSmartGuidanceDescription:
      'Review dosing reminders and practical tips before taking or switching brands.',
    loadingMessage: 'Preparing Rapid Analyze...',
    accessDeniedTitle: 'Access Limited to Patients',
    accessDeniedDescription:
      'Rapid Analyze is designed for patient accounts to review the medicines in their prescriptions. Please switch to a patient profile if you need to explore this tool.',
    accessDeniedNote:
      'Hospital representatives and admins have access to resource management tools that better fit their workflows.',
    goToDashboard: 'Go to Dashboard',
    genericLabel: 'Generic:',
  },
  bn: {
    pageTitle: 'র‌্যাপিড অ্যানালাইज़',
    tagline:
      'একই জেনেরিক উপাদানযুক্ত অন্যান্য ব্র্যান্ড সম্পর্কে জানুন, কেন ডাক্তার তা লিখেছেন এবং কীভাবে নিরাপদে ব্যবহার করবেন।',
    datasetVersionLabel: 'ডেটাসেট সংস্করণ',
    updatedOnLabel: 'হালনাগাদ তারিখ',
    searchCardTitle: 'জেনেরিক বা ব্র্যান্ড নাম দিয়ে অনুসন্ধান করুন',
    searchCardDescription:
      'আপনার প্রেসক্রিপশনের একটি ওষুধ লিখে মিল থাকা ব্র্যান্ড ও ব্যবহার নির্দেশনা দেখুন।',
    searchPlaceholder: 'যেমন: Paracetamol, Napa, Esomeprazole',
    analyzeButton: 'বিশ্লেষণ করুন',
    relatedLabel: 'সম্পর্কিত:',
    safeUseTitle: 'ব্যবহারের নিরাপত্তা সতর্কতা',
    safeUseDescription:
      'র‌্যাপিড অ্যানালাইज़ কেবল তথ্যের জন্য। ডাক্তার যে ডোজ নির্দেশ করেছেন সেটাই অনুসরণ করুন এবং ব্র্যান্ড বদলানোর আগে অবশ্যই পরামর্শ নিন।',
    safeUseNote: 'ডোজ ও সময় নিশ্চিত করতে প্রেসক্রিপশন হাতের কাছে রাখুন।',
    quickPickHeading: 'দ্রুত জেনেরিক নির্বাচন',
    matchTypeLabels: {
      brand: 'ব্র্যান্ড অনুযায়ী মিল পাওয়া গেছে',
      generic: 'জেনেরিক মিল',
      partial: 'সংশ্লিষ্ট ফলাফল প্রদর্শিত হচ্ছে',
      none: '',
    },
    genericIngredientLabel: 'জেনেরিক উপাদান',
    brandSearchedLabel: 'অনুসন্ধান করা ব্র্যান্ড',
    howItHelps: 'কীভাবে সাহায্য করে',
    whyDoctorsPrescribe: 'ডাক্তাররা কেন লিখে দেন',
    guidanceToFollow: 'যা অনুসরণ করা উচিত',
    fromYourSearch: 'আপনার অনুসন্ধান থেকে',
    whyItsChosen: 'এটি কেন বেছে নেওয়া হয়',
    primaryBenefits: 'মূল উপকারিতা',
    patientGuidance: 'রোগীর নির্দেশনা',
    commonStrengths: 'সাধারণ শক্তি',
    dosageForms: 'ডোজ ফর্ম',
    noMatchesTitle: 'সঠিক মিল পাওয়া যায়নি',
    noMatchesDescription:
      'পূর্ণ জেনেরিক নাম (যেমন “Paracetamol”) লিখে দেখুন অথবা নিচের প্রস্তাবিত বিকল্প বেছে নিন।',
    defaultIntroTitle: 'র‌্যাপিড অ্যানালাইज़ কীভাবে সাহায্য করে',
    defaultIntroDescription:
      'আপনার প্রেসক্রিপশনের একটি ওষুধ লিখলেই একই জেনেরিক উপাদানযুক্ত অন্যান্য ব্র্যান্ড, ব্যবহারের কারণ এবং নিরাপদ ব্যবহার নির্দেশনা দেখতে পারবেন।',
    helperMatchGenericsTitle: 'জেনেরিক মিল করুন',
    helperMatchGenericsDescription: 'একই সক্রিয় উপাদান ব্যবহার করা সব ব্র্যান্ড দেখুন।',
    helperDoctorInsightTitle: 'ডাক্তারের ব্যাখ্যা',
    helperDoctorInsightDescription: 'ডাক্তার বিশেষ ব্র্যান্ড কেন বেছে নিয়েছেন তা বুঝুন।',
    helperSmartGuidanceTitle: 'স্মার্ট নির্দেশনা',
    helperSmartGuidanceDescription: 'ডোজ স্মরণ করিয়ে দেওয়া ও ব্যবহারিক পরামর্শ আগে থেকেই জেনে নিন।',
    loadingMessage: 'র‌্যাপিড অ্যানালাইज़ প্রস্তুত হচ্ছে...',
    accessDeniedTitle: 'রোগীদের জন্য সীমিত',
    accessDeniedDescription:
      'প্রেসক্রিপশনের ওষুধ বিশ্লেষণের জন্য র‌্যাপিড অ্যানালাইज़ রোগী অ্যাকাউন্টের জন্য তৈরি। এই ফিচার দেখতে রোগী প্রোফাইলে ফিরে যান।',
    accessDeniedNote: 'হাসপাতাল প্রতিনিধিদের জন্য আলাদা রিসোর্স ব্যবস্থাপনা টুল উপলব্ধ রয়েছে।',
    goToDashboard: 'ড্যাশবোর্ডে যান',
    genericLabel: 'জেনেরিক:',
  },
} as const;

const toggleLabels: Record<Language, string> = {
  en: 'বাংলায় দেখুন',
  bn: 'ইংরেজিতে দেখুন',
};

export default function RapidAnalyzePage() {
  const router = useRouter();
  const [status, setStatus] = useState<AccessStatus>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<RapidAnalyzeSearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const text = translations[language];

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      setStatus('redirecting');
      router.push('/login?redirect=/rapid-analyze');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setStatus('redirecting');
      router.push('/login?redirect=/rapid-analyze');
      return;
    }

    if (currentUser.userType !== 'user') {
      setUser(currentUser);
      setStatus('denied');
      return;
    }

    setUser(currentUser);
    setStatus('ready');
  }, [router]);

  const quickPickGenerics = useMemo(
    () => getAllRapidAnalyzeGenerics().slice(0, QUICK_PICK_COUNT),
    [],
  );

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setQuery(value);
    if (!trimmed) {
      setResult(null);
      setHasSearched(false);
      return;
    }

    const searchResult = searchRapidAnalyze(trimmed);
    setResult(searchResult);
    setHasSearched(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch(query);
  };

  const handleQuickPick = (value: string) => {
    setQuery(value);
    const searchResult = searchRapidAnalyze(value);
    setResult(searchResult);
    setHasSearched(true);
  };

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-10 h-10 mx-auto text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">{text.loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Stethoscope className="w-6 h-6 text-rose-500" />
                {text.accessDeniedTitle}
              </CardTitle>
              <CardDescription>{text.accessDeniedDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {text.accessDeniedNote}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  {text.goToDashboard}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderGroup = (group: RapidAnalyzeGroup) => {
    if (!result) return null;

    const uniqueUses = uniqueList(group.medicines.map((medicine) => medicine.use));
    const uniqueWhys = uniqueList(group.medicines.map((medicine) => medicine.whyPrescribed));
    const uniqueGuidance = uniqueList(group.medicines.map((medicine) => medicine.patientGuidance));
    const uniqueCompanies = uniqueList(group.medicines.map((medicine) => medicine.company));

    return (
      <Card key={group.key} className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-2xl text-gray-900">{group.genericName}</CardTitle>
              </div>
              <CardDescription className="mt-2 space-y-1 text-gray-600">
                <span className="font-medium text-gray-700">{group.category.name}</span>
                <br />
                {group.category.description}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                {group.medicines.length} brand{group.medicines.length > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                {uniqueCompanies.length} manufacturer{uniqueCompanies.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <InsightTile
              icon={Sparkles}
              title={text.howItHelps}
              items={uniqueUses}
              tone="blue"
            />
            <InsightTile
              icon={Stethoscope}
              title={text.whyDoctorsPrescribe}
              items={uniqueWhys}
              tone="violet"
            />
            <InsightTile
              icon={Lightbulb}
              title={text.guidanceToFollow}
              items={uniqueGuidance}
              tone="emerald"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            {group.medicines.map((medicine) => {
              const isPrimaryMatch = Boolean(
                result.matchedBrand &&
                  medicine.brandName.toLowerCase() === result.matchedBrand.toLowerCase(),
              );

              return (
                <div
                  key={`${group.key}-${medicine.brandName}`}
                  className={cn(
                    'rounded-xl border bg-white p-5 shadow-sm transition-colors',
                    isPrimaryMatch
                      ? 'border-blue-300 bg-blue-50/70'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/40',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{medicine.brandName}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {text.genericLabel}{' '}
                        <span className="font-medium text-gray-800">{medicine.genericName}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isPrimaryMatch && (
                        <Badge className="bg-blue-600 text-white" variant="default">
                          {text.fromYourSearch}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-amber-200 text-amber-700">
                        <Factory className="mr-1 h-3 w-3" />
                        {medicine.company}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <DetailTile
                      icon={Info}
                      title={text.whyItsChosen}
                      description={medicine.whyPrescribed}
                    />
                    <DetailTile
                      icon={Sparkles}
                      title={text.primaryBenefits}
                      description={medicine.use}
                    />
                    <DetailTile
                      icon={Lightbulb}
                      title={text.patientGuidance}
                      description={medicine.patientGuidance}
                    />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {text.commonStrengths}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {medicine.commonStrengths.map((strength) => (
                            <Badge key={strength} variant="secondary" className="bg-white text-slate-700">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {text.dosageForms}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {medicine.dosageForms.map((form) => (
                            <Badge key={form} variant="secondary" className="bg-white text-slate-700">
                              {form}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-4xl font-bold text-gray-900">
                <Sparkles className="w-10 h-10 text-blue-600" />
                {text.pageTitle}
              </h1>
              <p className="mt-3 text-lg text-gray-600 max-w-2xl">{text.tagline}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-2"
              >
                <Languages className="w-4 h-4" />
                {toggleLabels[language]}
              </Button>
              <div className="text-sm text-gray-500">
                {text.datasetVersionLabel} {DATASET_METADATA.version}
                <br />
                {text.updatedOnLabel}{' '}
                {new Date(DATASET_METADATA.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-[1.6fr,1fr]">
          <Card className="border-blue-100 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">{text.searchCardTitle}</CardTitle>
              <CardDescription>{text.searchCardDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={text.searchPlaceholder}
                    className="h-12"
                    aria-label={text.searchCardTitle}
                  />
                  <Button type="submit" className="h-12 px-6">
                    {text.analyzeButton}
                  </Button>
                </div>
                {result?.suggestions && result.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">{text.relatedLabel}</span>
                    {result.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleQuickPick(suggestion)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 transition hover:bg-blue-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/70">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Info className="w-4 h-4" />
              {text.safeUseTitle}
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-emerald-800">
              <p>{text.safeUseDescription}</p>
              <p className="text-emerald-700/80">{text.safeUseNote}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            {text.quickPickHeading}
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickPickGenerics.map((generic) => (
              <Button
                key={generic}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPick(generic)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {generic}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {result && result.groups.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                const matchLabel = text.matchTypeLabels[result.matchType];
                return (
                  (result.matchType !== 'none' && matchLabel) || result.matchedGeneric || result.matchedBrand
                ) ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    {result.matchType !== 'none' && matchLabel && (
                      <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                        {matchLabel}
                      </Badge>
                    )}
                    {result.matchedGeneric && (
                      <span>
                        {text.genericIngredientLabel}:{' '}
                        <span className="font-medium text-gray-800">{result.matchedGeneric}</span>
                      </span>
                    )}
                    {result.matchedBrand && (
                      <span>
                        {text.brandSearchedLabel}:{' '}
                        <span className="font-medium text-gray-800">{result.matchedBrand}</span>
                      </span>
                    )}
                  </div>
                ) : null;
              })()}

              {result.groups.map((group) => renderGroup(group))}
            </div>
          ) : hasSearched ? (
            <Card className="border-dashed border-slate-200 bg-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                  <Info className="w-5 h-5 text-slate-500" />
                  {text.noMatchesTitle}
                </CardTitle>
                <CardDescription>{text.noMatchesDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result?.suggestions?.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPick(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 bg-white/60">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">{text.defaultIntroTitle}</CardTitle>
                <CardDescription>{text.defaultIntroDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <HelperTile
                  icon={Pill}
                  title={text.helperMatchGenericsTitle}
                  description={text.helperMatchGenericsDescription}
                />
                <HelperTile
                  icon={Stethoscope}
                  title={text.helperDoctorInsightTitle}
                  description={text.helperDoctorInsightDescription}
                />
                <HelperTile
                  icon={Lightbulb}
                  title={text.helperSmartGuidanceTitle}
                  description={text.helperSmartGuidanceDescription}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface InsightTileProps {
  icon: ElementType;
  title: string;
  items: string[];
  tone: 'blue' | 'violet' | 'emerald';
}

function InsightTile({ icon: Icon, title, items, tone }: InsightTileProps) {
  const palette = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      accent: 'text-blue-500',
    },
    violet: {
      border: 'border-violet-200',
      bg: 'bg-violet-50',
      text: 'text-violet-800',
      accent: 'text-violet-500',
    },
    emerald: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      accent: 'text-emerald-500',
    },
  }[tone];

  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', palette.border, palette.bg)}>
      <div className={cn('flex items-center gap-2 text-sm font-semibold', palette.text)}>
        <Icon className={cn('h-4 w-4', palette.accent)} />
        {title}
      </div>
      <ul className={cn('mt-2 space-y-1 text-sm leading-relaxed', palette.text)}>
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
        {items.length > 3 && <li>…and more</li>}
      </ul>
    </div>
  );
}

interface DetailTileProps {
  icon: ElementType;
  title: string;
  description: string;
}

function DetailTile({ icon: Icon, title, description }: DetailTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-slate-500" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

interface HelperTileProps {
  icon: ElementType;
  title: string;
  description: string;
}

function HelperTile({ icon: Icon, title, description }: HelperTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-blue-500" />
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}


