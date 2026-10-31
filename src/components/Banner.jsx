import { AnimatePresence, motion } from 'framer-motion'
import { Camera, X } from 'lucide-react'

export default function Banner({ node, onPost, onDismiss }) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ y: -140, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -140, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="fixed inset-x-0 top-0 z-40 mx-auto max-w-md px-3 pt-[max(12px,env(safe-area-inset-top))]"
        >
          <div className="relative flex items-center gap-3 rounded-3xl bg-gradient-to-r from-coral to-amber p-3 pr-2 text-ink shadow-2xl shadow-coral/40">
            <button onClick={() => onPost(node)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-xl">
                {node.emoji || <Camera size={20} className="text-amber" />}
              </motion.span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-widest opacity-70">Happening now - post your moment</span>
                <span className="block text-[15px] font-extrabold leading-tight">{node.title}</span>
              </span>
              <Camera size={22} className="shrink-0" />
            </button>
            <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 rounded-full p-2 opacity-70"><X size={16} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
