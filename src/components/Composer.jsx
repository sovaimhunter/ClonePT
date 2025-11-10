import { useRef } from 'react'

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
  onFileSelect,
  attachments = [],
  onRemoveAttachment,
  model,
  disabled,
  isStreaming,
  placeholder = '向 AI 提问，Shift+Enter 换行',
  draftHint,
}) {
  const fileInputRef = useRef(null)

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

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onFileSelect?.(files)
    }
    // 清空 input，允许重复选择同一文件
    event.target.value = ''
  }

  const hasText = Boolean(value?.trim())
  const hasContent = hasText || attachments.length > 0
  const currentModel = MODEL_OPTIONS.find((opt) => opt.value === model) || MODEL_OPTIONS[0]
  const supportsFiles = model === 'gpt-4o'

  return (
    <div className="composer">
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((attachment, index) => (
            <div key={index} className="attachment-item">
              {attachment.type?.startsWith('image/') ? (
                <img
                  src={attachment.preview || attachment.url}
                  alt={attachment.name}
                  className="attachment-image"
                />
              ) : (
                <div className="attachment-file">
                  <span className="attachment-icon">📄</span>
                  <span className="attachment-name">{attachment.name}</span>
                </div>
              )}
              <button
                type="button"
                className="attachment-remove"
                onClick={() => onRemoveAttachment?.(index)}
                disabled={isStreaming}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
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
        <div className="composer-footer-left">
          <span className="draft-indicator">{draftHint ?? '草稿将自动保存'}</span>
          {supportsFiles && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={handleFileClick}
                disabled={disabled || isStreaming}
                title="上传文件（仅 GPT-4o）"
              >
                📎 附件
              </button>
            </>
          )}
        </div>
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
            disabled={disabled || (!isStreaming && !hasContent)}
          >
            {isStreaming ? '停止生成' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Composer
