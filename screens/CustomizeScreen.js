import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { colors, type, spacing, radius } from '../utils/theme';
import { avatarSkins } from '../utils/mockData';
import { useUser } from '../context/UserContext';

export default function CustomizeScreen({ navigation }) {
  const { profile, uiUser, updateProfile } = useUser();
  const [selected, setSelected] = useState(uiUser?.avatarSkin || 'fox');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your avatar</Text>
      <Text style={styles.subtitle}>
        This is who your friends will see moving on the map.
      </Text>

      <FlatList
        data={avatarSkins}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = item.id === selected;
          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(item.id)}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>Your badges</Text>
            <View style={styles.badgesRow}>
              {(uiUser?.badges || []).length === 0 && (
                <Text style={styles.noBadges}>Complete a trip to earn your first badge.</Text>
              )}
              {(uiUser?.badges || []).map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Text style={styles.badgeChipText}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        }
      />

      <Pressable
        style={styles.saveButton}
        onPress={() => {
          // Persists to Firestore via UserContext -> services/userProfile.js,
          // so this now survives an app restart (it didn't before).
          if (profile) {
            updateProfile({ ...profile, avatarSkin: selected });
          }
          navigation.goBack();
        }}
      >
        <Text style={styles.saveButtonText}>Save and go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl + 20,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: type.display,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  grid: {
    paddingBottom: spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.accentAmber,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: type.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.accentAmber,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  saveButtonText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.background,
  },
  badgesSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgesTitle: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noBadges: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  badgeChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },
  badgeChipText: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    color: colors.accentTeal,
  },
});
