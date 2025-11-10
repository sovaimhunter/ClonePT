import { useEffect } from 'react'

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    // 禁止背景滚动
    document.body.style.overflow = 'hidden'
    
    // ESC 键关闭
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="lightbox-close"
          onClick={onClose}
          type="button"
          aria-label="关闭"
        >
          ✕
        </button>
        <img
          src={src}
          alt={alt}
          className="lightbox-image"
        />
      </div>
    </div>
  )
}

export default ImageLightbox

