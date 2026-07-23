import React, { Component } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: string | null;
}

/**
 * 全局错误边界：捕获子树渲染期的 JS 错误，避免 release 包直接退出到桌面。
 * 捕获后显示错误信息（含 stack）供诊断，并提供"返回"按钮。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(e: Error): State {
    const msg = e?.message || String(e);
    const stack = (e as any)?.stack || '';
    return { error: msg + '\n\n' + stack };
  }

  componentDidCatch(e: Error) {
    console.warn('[ErrorBoundary caught]', e?.message, (e as any)?.stack);
  }

  handleDismiss = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#c00' }}>页面渲染出错</Text>
          <Text style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>请截图反馈，点返回可继续使用</Text>
          <ScrollView style={{ width: '100%', maxHeight: 360 }}>
            <Text style={{ fontSize: 11, color: '#333' }}>{this.state.error}</Text>
          </ScrollView>
          <TouchableOpacity
            onPress={this.handleDismiss}
            style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 28, backgroundColor: '#eee', borderRadius: 8 }}
          >
            <Text style={{ fontSize: 14, color: '#333' }}>返回</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
