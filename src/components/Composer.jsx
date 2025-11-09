function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = '向 DeepSeek 提问，Shift+Enter 换行',
  draftHint,
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit?.()
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
        disabled={disabled}
      />
      <div className="composer-footer">
        <span className="draft-indicator">{draftHint ?? '草稿将自动保存'}</span>
        <div className="composer-actions">
          <span className="shortcut-hint">Enter 发送 · Shift+Enter 换行</span>
          <button
            className="primary-btn"
            type="button"
            onClick={() => onSubmit?.()}
            disabled={disabled || !value?.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

export default Composer

