import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';

type AuthMode = 'signIn' | 'signUp';
type Feedback = { title: string; message: string; type: 'error' | 'success' };

const getAuthErrorMessage = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console. Add it under Authentication settings.';
    case 'auth/invalid-api-key':
      return 'The Firebase API key is invalid. Check the configuration in src/config/firebase.ts.';
    case 'auth/app-not-authorized':
      return 'This app is not authorized to use the Firebase project. Check the Firebase app configuration.';
    default:
      return 'Could not authenticate. Check your Firebase settings and try again.';
  }
};

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setFeedback({
        title: 'Missing information',
        message: 'Enter your email and password.',
        type: 'error',
      });
      return;
    }
    if (mode === 'signUp' && !name.trim()) {
      setFeedback({
        title: 'Name required',
        message: 'Enter your name to create an account.',
        type: 'error',
      });
      return;
    }
    if (mode === 'signUp' && password.length < 6) {
      setFeedback({
        title: 'Password too short',
        message: 'Use a password with at least 6 characters.',
        type: 'error',
      });
      return;
    }

    setFeedback(null);
    setLoading(true);
    try {
      if (mode === 'signUp') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );
        await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
    } catch (error: unknown) {
      setFeedback({
        title: 'Authentication failed',
        message: getAuthErrorMessage(error),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFeedback({
        title: 'Email required',
        message: 'Enter your email address first.',
        type: 'error',
      });
      return;
    }

    setFeedback(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setFeedback({
        title: 'Check your inbox',
        message: 'A password reset link has been sent.',
        type: 'success',
      });
    } catch (error: unknown) {
      setFeedback({
        title: 'Could not send reset email',
        message: getAuthErrorMessage(error),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signUp';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Ionicons name="leaf-outline" size={32} color="#F4E7C8" />
          </View>
          <Text style={styles.eyebrow}>A PLACE TO PAUSE & FOCUS</Text>
          <Text style={styles.title}>Study Room</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Settle in. Your next favorite study spot is waiting.'
              : 'Find a quiet corner for your next big idea.'}
          </Text>

          <View style={styles.form}>
            {isSignUp && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#9A9689"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
              </>
            )}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#9A9689"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#9A9689"
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            {!isSignUp && (
              <TouchableOpacity
                style={styles.resetLink}
                onPress={resetPassword}
                disabled={loading}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp ? 'Create account' : 'Sign in'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {feedback && (
            <View
              accessibilityRole="alert"
              style={[
                styles.feedback,
                feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
              ]}
            >
              <Text style={styles.feedbackTitle}>{feedback.title}</Text>
              <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setFeedback(null);
                setMode(isSignUp ? 'signIn' : 'signUp');
              }}
              disabled={loading}
            >
              <Text style={styles.linkText}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4EFE4' },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#294A3C',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    transform: [{ rotate: '-4deg' }],
  },
  eyebrow: { textAlign: 'center', fontSize: 10, letterSpacing: 2.4, color: '#9A7040', fontWeight: '800', marginBottom: 8 },
  title: { textAlign: 'center', fontSize: 31, color: '#263D32', fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { textAlign: 'center', color: '#7C796D', fontSize: 14, marginTop: 9, lineHeight: 21 },
  form: {
    backgroundColor: '#FFFCF6',
    borderWidth: 1,
    borderColor: '#E8DFCF',
    borderRadius: 24,
    padding: 22,
    marginTop: 30,
    shadowColor: '#5C4A30',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  feedback: {
    marginTop: 16,
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
  },
  feedbackError: { backgroundColor: '#FFF1EF', borderColor: '#E7B5AE' },
  feedbackSuccess: { backgroundColor: '#EDF7EF', borderColor: '#A9CDB1' },
  feedbackTitle: { color: '#263D32', fontSize: 13, fontWeight: '700' },
  feedbackMessage: { color: '#625E54', fontSize: 13, lineHeight: 19, marginTop: 3 },
  label: { color: '#4F5B4C', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5DDCE',
    backgroundColor: '#FAF7F0',
    borderRadius: 13,
    paddingHorizontal: 13,
    color: '#263D32',
    fontSize: 15,
    marginBottom: 16,
  },
  resetLink: { alignSelf: 'flex-end', marginTop: -5, marginBottom: 18 },
  linkText: { color: '#477454', fontWeight: '700', fontSize: 14 },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#315A45',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  switchText: { color: '#817C70', fontSize: 14 },
});

export default AuthScreen;
