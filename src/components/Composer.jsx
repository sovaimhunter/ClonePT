const MODEL_OPTIONS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', icon: '💬' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', icon: '🧠' },
  { value: 'gpt-4o', label: 'ChatGPT 4o', icon: '🤖' },
]

function Composer({
  value,
  onChange,
  onSubmit,
  onStopGeneration,
  onModelChange,
  model,
  disabled,
  isStreaming,
  placeholder = '向 AI 提问，Shift+Enter 换行',
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

  const hasText = Boolean(value?.trim())
  const currentModel = MODEL_OPTIONS.find((opt) => opt.value === model) || MODEL_OPTIONS[0]

  return (
    <div className="composer">
      <div className="composer-input-wrapper">
        <div className="model-selector">
          <select
            className="model-select"
            value={model}
            onChange={(e) => onModelChange?.(e.target.value)}
            disabled={isStreaming || disabled}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="composer-input"
          placeholder={placeholder}
          rows={4}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
        />
      </div>
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
            disabled={disabled || (!isStreaming && !hasText)}
          >
            {isStreaming ? '停止生成' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Composer
