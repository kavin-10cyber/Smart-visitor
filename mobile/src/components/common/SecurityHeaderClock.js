import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import s from '../../styles/securityStyles';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

function formatClockTime(date = new Date()) {
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} | ${timeStr}`;
}

function SecurityHeaderClock() {
  const [currentClock, setCurrentClock] = useState(formatClockTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(formatClockTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View>
      <Text style={s.headerTitle}>Dashboard</Text>
      <Text style={s.headerTimestamp}>{currentClock}</Text>
    </View>
  );
}

export default React.memo(SecurityHeaderClock);
