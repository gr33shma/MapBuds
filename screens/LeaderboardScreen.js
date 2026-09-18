import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { colors, type, spacing, radius } from '../utils/theme';
import { mockLeaderboard, avatarSkins } from '../utils/mockData';

export default function LeaderboardScreen({ navigation }) {
  const ranked = [...mockLeaderboard].sort((a, b) => b.xp - a.xp);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>Ranked by total XP this week</Text>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        renderItem={({ item, index }) => {
          const skin = avatarSkins.find((s) => s.id === item.avatarSkin) || avatarSkins[0];
          const isMe = item.id === 'me';
          return (
            <View style={[styles.row, isMe && styles.rowMe]}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.emoji}>{skin.emoji}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.xp}>{item.xp} XP</Text>
            </View>
          );
        }}
      />

      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back to map</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMe: {
    borderColor: colors.accentAmber,
  },
  rank: {
    fontFamily: type.displaySemi,
    fontSize: 16,
    color: colors.accentTeal,
    width: 24,
  },
  emoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: type.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  xp: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.accentAmber,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
