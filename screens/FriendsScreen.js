import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { colors, type, spacing, radius } from '../utils/theme';
import { useUser } from '../context/UserContext';
import { addFriend } from '../services/friends';

// Minimal "add a friend" screen. Nobody had built this yet — friend
// syncing (locationSync.js) and the friends list (friends.js) both
// existed, but there was no UI to actually create a friend link
// between two real people.
//
// IMPORTANT: adding a friend here only affects YOUR OWN friends list.
// For two people to see each other on the map / leaderboard, BOTH
// people need to open this screen on their own device and add the
// other person's ID. It is not automatic just from opening the app.
export default function FriendsScreen({ navigation }) {
  const { uid } = useUser();
  const [friendIdInput, setFriendIdInput] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAddFriend() {
    if (!friendIdInput.trim() || !uid) return;
    setSaving(true);
    try {
      await addFriend(uid, friendIdInput.trim());
      Alert.alert('Added', 'Friend added. Ask them to add your ID too so you see each other.');
      setFriendIdInput('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleShareMyId() {
    Share.share({ message: `Add me on MapBuds! My ID is:\n${uid}` });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>
      <Text style={styles.subtitle}>
        Both people need to add each other's ID for friend syncing to work both ways.
      </Text>

      <View style={styles.myIdCard}>
        <Text style={styles.myIdLabel}>Your ID (share this with a friend)</Text>
        <Text selectable style={styles.myIdValue}>{uid || 'Loading...'}</Text>
        <Pressable style={styles.shareButton} onPress={handleShareMyId}>
          <Text style={styles.shareButtonText}>Share my ID</Text>
        </Pressable>
      </View>

      <Text style={styles.inputLabel}>Add a friend by their ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste their ID here"
        placeholderTextColor={colors.textMuted}
        value={friendIdInput}
        onChangeText={setFriendIdInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.addButton} onPress={handleAddFriend} disabled={saving}>
        <Text style={styles.addButtonText}>{saving ? 'Adding...' : 'Add friend'}</Text>
      </Pressable>

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
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  myIdCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  myIdLabel: {
    fontFamily: type.bodySemi,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  myIdValue: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.accentTeal,
    marginBottom: spacing.sm,
  },
  shareButton: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },
  shareButtonText: {
    fontFamily: type.bodySemi,
    fontSize: 13,
    color: colors.accentTeal,
  },
  inputLabel: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: type.body,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.accentAmber,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  addButtonText: {
    fontFamily: type.bodySemi,
    fontSize: 15,
    color: colors.background,
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
