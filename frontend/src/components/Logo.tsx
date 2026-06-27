import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '@/src/lib/theme';

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name="feather" size={size * 0.55} color={theme.color.brand} />
    </View>
  );
}

export function LogoWordmark() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Logo size={64} />
      <Text style={styles.title}>AYURVEDA</Text>
      <Text style={styles.subtitle}>NURSING ACADEMY</Text>
      <View style={styles.ribbon}>
        <Text style={styles.ribbonText}>TRADITION · CARE · KNOWLEDGE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.color.brandSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.color.brand,
  },
  title: {
    color: theme.color.brand,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 14,
  },
  subtitle: {
    color: theme.color.onSurface,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 2,
  },
  ribbon: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.color.brand,
  },
  ribbonText: {
    color: theme.color.onBrandPrimary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
