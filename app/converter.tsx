import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, SectionTitle } from '../src/components/ui';
import { CONVERTER_TOOLS } from '../src/converter/tools';
import { compressImage, convertImage, resizeImage, type ImageFormat } from '../src/converter/imageService';
import { mergePdfs, pdfPageCount, splitPdf } from '../src/converter/pdfService';
import { imagesToPdf, textToPdf } from '../src/converter/printService';
import { MAX_INPUT_BYTES, isPdfName, isSupportedImage } from '../src/converter/validation';
import { cleanTempFiles, deleteQuietly, ensureConverterDirs, pickFiles, type PickedFile } from '../src/converter/fileIO';
import type { ConversionRecord, ConverterTool } from '../src/converter/types';
import { deleteConversion, insertConversion, listConversions } from '../src/storage/database';
import { useTheme } from '../src/theme/ThemeContext';
import { formatBytes } from '../src/downloads/downloadManager';
import { newId } from '../src/utils/helpers';

interface JobState {
  tool: ConverterTool;
  files: PickedFile[];
  pageRanges: string;
  pageCount: number | null;
  format: ImageFormat;
  width: string;
  quality: 0.9 | 0.7 | 0.5;
  running: boolean;
  result: { ok: true; outputUri: string; outputName: string; size: number } | { ok: false; error: string } | null;
}

const QUALITY_LABELS: Array<{ value: 0.9 | 0.7 | 0.5; label: string }> = [
  { value: 0.9, label: 'High' },
  { value: 0.7, label: 'Medium' },
  { value: 0.5, label: 'Low' },
];

export default function ConverterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius, type } = useTheme();
  const [recents, setRecents] = useState<ConversionRecord[]>([]);
  const [job, setJob] = useState<JobState | null>(null);

  const refresh = useCallback(() => {
    void listConversions().then(setRecents).catch(() => {});
  }, []);

  useEffect(() => {
    void ensureConverterDirs().catch(() => {});
    refresh();
  }, [refresh]);

  const openTool = (tool: ConverterTool) => {
    if (!tool.availability.available) {
      Alert.alert('Not available', tool.availability.reason);
      return;
    }
    setJob({ tool, files: [], pageRanges: '', pageCount: null, format: 'png', width: '1920', quality: 0.7, running: false, result: null });
  };

  const onPick = async () => {
    if (!job || job.running) return;
    const picked = await pickFiles(job.tool.pickMime, job.tool.multiple).catch(() => ({ canceled: true as const }));
    if (picked.canceled) return; // cancellation is normal, not an error
    const files = picked.files;
    if (job.tool.id === 'pdf-merge' || job.tool.id === 'pdf-split' || job.tool.id === 'pdf-extract') {
      const bad = files.find((f) => !isPdfName(f.name));
      if (bad) {
        Alert.alert('Unsupported file', `"${bad.name}" is not a PDF.`);
        return;
      }
    }
    if (job.tool.category === 'Image') {
      const bad = files.find((f) => !isSupportedImage(f.name, f.mimeType));
      if (bad) {
        Alert.alert('Unsupported file', `"${bad.name}" is not a supported image (PNG, JPEG, WebP).`);
        return;
      }
    }
    let pageCount: number | null = null;
    if ((job.tool.id === 'pdf-split' || job.tool.id === 'pdf-extract') && files[0]) {
      pageCount = await pdfPageCount(files[0].uri);
      if (pageCount === null) {
        Alert.alert('Unreadable PDF', 'The file is corrupted, encrypted, or not a valid PDF.');
        return;
      }
    }
    setJob({ ...job, files, pageCount, result: null });
  };

  const runJob = async () => {
    if (!job || job.running || job.files.length === 0) return;
    setJob({ ...job, running: true, result: null });
    const first = job.files[0]!;
    let r;
    try {
      switch (job.tool.id) {
        case 'pdf-merge':
          r = await mergePdfs(job.files.map((f) => f.uri), first.name);
          break;
        case 'pdf-split':
        case 'pdf-extract':
          if (!job.pageRanges.trim()) {
            r = { ok: false as const, error: 'Enter page ranges first, e.g. 1-3, 5.' };
            break;
          }
          r = await splitPdf(first.uri, job.pageRanges, first.name);
          break;
        case 'images-to-pdf':
          r = await imagesToPdf(job.files);
          break;
        case 'image-convert':
          r = await convertImage(first.uri, first.name, job.format);
          break;
        case 'image-resize': {
          const w = Number(job.width);
          r = await resizeImage(first.uri, first.name, w);
          break;
        }
        case 'image-compress':
          r = await compressImage(first.uri, first.name, job.quality);
          break;
        case 'txt-to-pdf':
          r = await textToPdf(first.uri, first.name);
          break;
        default:
          r = { ok: false as const, error: 'This tool is not available.' };
          break;
      }
    } catch (e) {
      r = { ok: false as const, error: e instanceof Error ? e.message : 'Conversion failed.' };
    }
    await cleanTempFiles().catch(() => {});
    if (r.ok && r.outputUri && r.outputName) {
      const record: ConversionRecord = {
        id: newId('conv'),
        toolId: job.tool.id,
        toolTitle: job.tool.title,
        inputName: first.name,
        outputName: r.outputName,
        outputUri: r.outputUri,
        mimeType: r.mimeType ?? null,
        size: r.size ?? 0,
        status: 'completed',
        error: null,
        createdAt: Date.now(),
      };
      await insertConversion(record).catch(() => {});
      refresh();
      setJob({ ...job, running: false, result: { ok: true, outputUri: r.outputUri, outputName: r.outputName, size: r.size ?? 0 } });
    } else {
      setJob({ ...job, running: false, result: { ok: false, error: r.error ?? 'Conversion failed.' } });
    }
  };

  const openFile = async (uri: string, filename: string, mime: string | null) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Unavailable', 'No app on this device can open the file.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: mime ?? undefined, dialogTitle: filename });
    } catch {
      Alert.alert('Could not open', 'The file could not be opened.');
    }
  };

  const categories: Array<'PDF' | 'Image' | 'Document'> = ['PDF', 'Image', 'Document'];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader title="Converter" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {categories.map((cat) => (
          <View key={cat}>
            <SectionTitle>{cat === 'PDF' ? 'PDF TOOLS' : cat === 'Image' ? 'IMAGE TOOLS' : 'DOCUMENT TOOLS'}</SectionTitle>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
              {CONVERTER_TOOLS.filter((t) => t.category === cat).map((t, i, arr) => (
                <Pressable
                  key={t.id}
                  onPress={() => openTool(t)}
                  style={[styles.toolRow, i === arr.length - 1 && styles.lastRow, { borderBottomColor: colors.border }]}
                  accessibilityLabel={t.title}
                  accessibilityRole="button"
                >
                  <View style={[styles.toolIcon, { backgroundColor: colors.surface2 }]}>
                    <Ionicons
                      name={t.category === 'PDF' ? 'document-text' : t.category === 'Image' ? 'image' : 'document'}
                      size={20}
                      color={colors.text}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toolTitle, { color: colors.text, fontSize: type.body }]}>{t.title}</Text>
                    <Text style={[styles.toolSub, { color: colors.textMuted, fontSize: type.caption }]} numberOfLines={2}>
                      {t.availability.available ? t.description : 'Unavailable — tap for why.'}
                    </Text>
                  </View>
                  {!t.availability.available && (
                    <View style={[styles.badge, { borderColor: colors.border, borderRadius: radius.md }]}>
                      <Text style={[styles.badgeText, { color: colors.textMuted }]}>Unavailable</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <SectionTitle>RECENT CONVERSIONS</SectionTitle>
        {recents.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Text style={[styles.hint, { color: colors.textMuted, fontSize: type.body }]}>
              Nothing converted yet. Outputs you create are listed here; originals are never modified.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            {recents.map((r, i) => (
              <View key={r.id} style={[styles.toolRow, i === recents.length - 1 && styles.lastRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolTitle, { color: colors.text, fontSize: type.body }]} numberOfLines={1}>
                    {r.outputName}
                  </Text>
                  <Text style={[styles.toolSub, { color: colors.textMuted, fontSize: type.caption }]}>
                    {r.toolTitle} · {formatBytes(r.size)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void openFile(r.outputUri, r.outputName, r.mimeType)}
                  hitSlop={10}
                  style={styles.miniBtn}
                  accessibilityLabel={`Open ${r.outputName}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="open-outline" size={20} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete conversion?', `${r.outputName}\nThe output file will also be deleted.`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          void (async () => {
                            await deleteQuietly(r.outputUri);
                            await deleteConversion(r.id);
                            refresh();
                          })(),
                      },
                    ])
                  }
                  hitSlop={10}
                  style={styles.miniBtn}
                  accessibilityLabel={`Delete ${r.outputName}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      {/* Tool runner sheet */}
      <Modal visible={job !== null} transparent animationType="slide" onRequestClose={() => { if (!job?.running) setJob(null); }}>
        <View style={[styles.sheetWrap, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            {job && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={[styles.sheetTitle, { color: colors.text, fontSize: type.heading }]}>{job.tool.title}</Text>
                <Pressable
                  onPress={() => void onPick()}
                  disabled={job.running}
                  style={[styles.pickBtn, { borderColor: colors.border, borderRadius: radius.md, opacity: job.running ? 0.5 : 1 }]}
                  accessibilityLabel="Pick files"
                  accessibilityRole="button"
                >
                  <Ionicons name="folder-outline" size={20} color={colors.accent} style={{ marginRight: 10 }} />
                  <Text style={[styles.pickText, { color: colors.text, fontSize: type.body }]}>
                    {job.files.length === 0 ? 'Pick file' + (job.tool.multiple ? 's' : '') : `${job.files.length} selected`}
                  </Text>
                </Pressable>
                {job.files.slice(0, 5).map((f) => (
                  <Text key={f.uri} style={[styles.fileName, { color: colors.textMuted, fontSize: type.caption }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                ))}

                {(job.tool.id === 'pdf-split' || job.tool.id === 'pdf-extract') && (
                  <>
                    <Text style={[styles.optLabel, { color: colors.text, fontSize: type.body }]}>
                      Pages{job.pageCount ? ` (document has ${job.pageCount})` : ''}
                    </Text>
                    <TextInput
                      value={job.pageRanges}
                      onChangeText={(v) => setJob({ ...job, pageRanges: v })}
                      placeholder="1-3, 5"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="numbers-and-punctuation"
                      editable={!job.running}
                      style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
                      accessibilityLabel="Page ranges"
                    />
                  </>
                )}
                {job.tool.id === 'image-convert' && (
                  <>
                    <Text style={[styles.optLabel, { color: colors.text, fontSize: type.body }]}>Format</Text>
                    <View style={styles.chips}>
                      {(['png', 'jpeg', 'webp'] as const).map((f) => (
                        <Pressable
                          key={f}
                          onPress={() => setJob({ ...job, format: f })}
                          disabled={job.running}
                          style={[styles.chip, { borderColor: job.format === f ? colors.accent : colors.border, backgroundColor: job.format === f ? colors.accentSoft : 'transparent', borderRadius: radius.md }]}
                          accessibilityLabel={`Convert to ${f.toUpperCase()}`}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.chipText, { color: job.format === f ? colors.accent : colors.text }]}>{f.toUpperCase()}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {job.tool.id === 'image-resize' && (
                  <>
                    <Text style={[styles.optLabel, { color: colors.text, fontSize: type.body }]}>Max width (px)</Text>
                    <TextInput
                      value={job.width}
                      onChangeText={(v) => setJob({ ...job, width: v.replace(/[^0-9]/g, '') })}
                      placeholder="1920"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      editable={!job.running}
                      style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
                      accessibilityLabel="Max width in pixels"
                    />
                  </>
                )}
                {job.tool.id === 'image-compress' && (
                  <>
                    <Text style={[styles.optLabel, { color: colors.text, fontSize: type.body }]}>Quality</Text>
                    <View style={styles.chips}>
                      {QUALITY_LABELS.map((q) => (
                        <Pressable
                          key={q.label}
                          onPress={() => setJob({ ...job, quality: q.value })}
                          disabled={job.running}
                          style={[styles.chip, { borderColor: job.quality === q.value ? colors.accent : colors.border, backgroundColor: job.quality === q.value ? colors.accentSoft : 'transparent', borderRadius: radius.md }]}
                          accessibilityLabel={`${q.label} quality`}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.chipText, { color: job.quality === q.value ? colors.accent : colors.text }]}>{q.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {job.result && !job.result.ok && (
                  <Text style={[styles.error, { color: colors.danger, fontSize: type.body }]}>{job.result.error}</Text>
                )}
                {job.result && job.result.ok && (
                  <View style={[styles.result, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: colors.text, fontSize: type.body }]} numberOfLines={1}>
                        {job.result.outputName}
                      </Text>
                      <Text style={[styles.resultSub, { color: colors.textMuted, fontSize: type.caption }]}>
                        {formatBytes(job.result.size)} · saved in Orizen storage
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void openFile(job.result && job.result.ok ? job.result.outputUri : '', job.result && job.result.ok ? job.result.outputName : '', null)}
                      hitSlop={10}
                      style={styles.miniBtn}
                      accessibilityLabel="Open converted file"
                      accessibilityRole="button"
                    >
                      <Ionicons name="open-outline" size={22} color={colors.accent} />
                    </Pressable>
                  </View>
                )}

                <View style={styles.sheetRow}>
                  <Pressable
                    onPress={() => { if (!job.running) setJob(null); }}
                    style={[styles.sheetBtn, { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1 }]}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.textMuted }}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void runJob()}
                    disabled={job.running || job.files.length === 0}
                    style={[styles.sheetBtn, { backgroundColor: colors.accent, borderRadius: radius.md, opacity: job.running || job.files.length === 0 ? 0.5 : 1, flexDirection: 'row' }]}
                    accessibilityLabel={job.running ? 'Converting' : 'Convert'}
                    accessibilityRole="button"
                  >
                    {job.running && <ActivityIndicator size="small" color={colors.onAccent} style={{ marginRight: 8 }} />}
                    <Text style={{ color: colors.onAccent, fontWeight: '700' }}>{job.running ? 'Working…' : 'Convert'}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.note, { color: colors.textMuted, fontSize: type.caption }]}>
                  Files stay on this device. Conversions over {Math.round(MAX_INPUT_BYTES / 1048576)} MB are refused to protect memory.
                </Text>
                <View style={{ height: insets.bottom + 8 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  card: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, marginBottom: 4 },
  toolRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12, minHeight: 64 },
  lastRow: { borderBottomWidth: 0 },
  toolIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontWeight: '700' },
  toolSub: { marginTop: 2, lineHeight: 17 },
  badge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  hint: { padding: 14, lineHeight: 20 },
  miniBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', padding: 20 },
  sheetTitle: { fontWeight: '800', marginBottom: 12 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, minHeight: 52 },
  pickText: { fontWeight: '600' },
  fileName: { marginTop: 4 },
  optLabel: { fontWeight: '700', marginTop: 14, marginBottom: 6 },
  field: { borderWidth: 1, paddingHorizontal: 12, height: 48 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 9, minHeight: 44, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  error: { marginTop: 12, lineHeight: 19 },
  result: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 12 },
  resultName: { fontWeight: '700' },
  resultSub: { marginTop: 2 },
  sheetRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  sheetBtn: { paddingHorizontal: 20, paddingVertical: 11, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  note: { marginTop: 12, lineHeight: 17 },
});
