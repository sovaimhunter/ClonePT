function Composer({
  value,
  onChange,
  onSubmit,
  onStopGeneration,
  disabled,
  isStreaming,
  placeholder = '向 DeepSeek 提问，Shift+Enter 换行',
  draftHint,
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (isStreaming) {
        onStopGeneration?.()
      } else {
        onSubmit?.()
      }
    }
  }

  return (
    <div className="composer">
      <textarea
        className="composer-input"
        placeholder={placeholder}
        rows={4}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isStreaming}
      />
      <div className="composer-footer">
        <span className="draft-indicator">{draftHint ?? '草稿将自动保存'}</span>
        <div className="composer-actions">
          <span className="shortcut-hint">
            {isStreaming
              ? '生成中 · Enter 停止'
              : 'Enter 发送 · Shift+Enter 换行'}
          </span>
          <button
            className={`primary-btn ${isStreaming ? 'primary-btn-stop' : ''}`}
            type="button"
            onClick={() => {
              if (isStreaming) {
                onStopGeneration?.()
              } else {
                onSubmit?.()
              }
            }}
            disabled={disabled || (!isStreaming && !value?.trim())}
          >
            {isStreaming ? '停止生成' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Composer
