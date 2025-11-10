/**
 * Composer 相关的 actions
 * 处理输入框状态和附件管理
 */

export function createComposerActions(set, get) {
  return {
    /**
     * 设置输入框的值
     */
    setComposerValue(value) {
      set({ composerValue: value })
    },

    /**
     * 清除错误信息
     */
    clearError() {
      set({ error: null })
    },

    /**
     * 设置当前选择的模型
     */
    setModel(model) {
      set({ model })
    },

    /**
     * 添加附件
     */
    addAttachment(attachment) {
      set((state) => ({
        attachments: [...state.attachments, attachment],
      }))
    },

    /**
     * 移除指定索引的附件
     */
    removeAttachment(index) {
      set((state) => ({
        attachments: state.attachments.filter((_, i) => i !== index),
      }))
    },

    /**
     * 清空所有附件
     */
    clearAttachments() {
      set({ attachments: [] })
    },
  }
}

