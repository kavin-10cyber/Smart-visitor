import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const _pad = (n) => String(n).padStart(2, '0');

function LiveHeaderClock() {
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const liveTimeStr = `${_pad(liveTime.getHours())}:${_pad(liveTime.getMinutes())}:${_pad(liveTime.getSeconds())}`;
  const liveDateStr = liveTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>{liveTimeStr}</Text>
      <Text style={styles.dateText}>{liveDateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 1,
  },
});

export default React.memo(LiveHeaderClock);
