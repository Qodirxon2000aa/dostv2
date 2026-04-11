import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * Matn xabarlari — ranglar index.css .sc-bubble* orqali tema bilan (dark / light).
 */
const SupportChatMessageBubble = ({ message: m, outgoing, formatTime, actions }) => {
  const legacyImageOnly = Boolean(m?.mediaType === 'image' && m?.mediaUrl);
  const rawText = m?.body != null ? String(m.body).trim() : '';
  const text = rawText || (legacyImageOnly ? '[Rasm]' : '');
  const edited = Boolean(m?.editedAt);

  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'} px-0.5`}>
      <div className={['sc-bubble', outgoing ? 'sc-bubble-out' : 'sc-bubble-in'].join(' ')}>
        {!outgoing && m?.senderName && (
          <p className="text-[13px] font-semibold sc-bubble-name mb-0.5 truncate max-w-[15rem]">{m.senderName}</p>
        )}
        {text ? (
          <p className="text-[16px] leading-[1.38] break-words whitespace-pre-wrap">{text}</p>
        ) : null}
        <div
          className={`flex flex-wrap items-center justify-end gap-x-1 mt-0.5 ${
            outgoing ? 'sc-bubble-meta-out' : 'sc-bubble-meta-in'
          }`}
        >
          {actions?.onEdit || actions?.onDelete ? (
            <span className="flex items-center gap-0 mr-1 order-first">
              {actions.onEdit && (
                <button
                  type="button"
                  onClick={actions.onEdit}
                  disabled={actions.disabled}
                  className={`p-1 rounded-md min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors disabled:opacity-40 ${
                    outgoing ? 'sc-bubble-action-out' : 'sc-bubble-action-in'
                  }`}
                  aria-label="Tahrirlash"
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
              )}
              {actions.onDelete && (
                <button
                  type="button"
                  onClick={actions.onDelete}
                  disabled={actions.disabled}
                  className="p-1 rounded-md min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors disabled:opacity-40 sc-bubble-action-danger"
                  aria-label="O‘chirish"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </span>
          ) : null}
          <p className="text-[11px] tabular-nums leading-none ml-auto">
            {formatTime(m?.createdAt)}
            {edited ? <span className="opacity-80"> · tahrir</span> : null}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportChatMessageBubble;
