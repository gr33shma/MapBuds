import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, type, spacing, radius } from '../utils/theme';

// Expects a landmark object shaped: { name, fact, lat, lng }
// This is the exact contract Person 4 will send once their
// Wikipedia GeoSearch integration is wired up — nothing here
// needs to change at integration time.
export default function LandmarkModal({ visible, landmark, onClose }) {
  if (!landmark) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>Nearby</Text>
          <Text style={styles.title}>{landmark.name}</Text>
          <Text style={styles.fact}>{landmark.fact}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Keep going</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000066',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: type.bodySemi,
    fontSize: 12,
    color: colors.accentTeal,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: type.display,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fact: {
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accentAmber,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.background,
  },
});
