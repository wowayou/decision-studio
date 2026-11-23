import { Component, type ErrorInfo, type ReactNode } from 'react';
import { download, readLocalRaw } from '../storage/browser';
import { Icon } from './Icon';

interface State { error: Error | null }

// A render failure must not strand the user's only copy of the project behind a blank page.
// The fallback reads storage directly and never writes it.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Decision Studio 界面渲染失败', error, info.componentStack);
  }
  override render() {
    if (!this.state.error) return this.props.children;
    const raw = readLocalRaw();
    return <main className="crash">
      <section className="card crash-card" role="alert">
        <span className="iconbox danger"><Icon name="alert"/></span>
        <h1>界面遇到错误，已停止显示</h1>
        <p>本机保存的项目没有被修改。请先下载备份，再重新加载页面；如果问题重复出现，请保留备份文件。</p>
        <p className="crash-detail">{this.state.error.message}</p>
        <div className="actions">
          {raw !== null && <button className="button primary" onClick={() => download('decision-studio-backup.json', 'application/json', raw)}>
            <Icon name="download" size={16}/> 下载本机项目备份</button>}
          <button className="button secondary" onClick={() => location.reload()}><Icon name="refresh" size={16}/> 重新加载</button>
        </div>
      </section>
    </main>;
  }
}
