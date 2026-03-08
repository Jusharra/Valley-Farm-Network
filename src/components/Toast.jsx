import { Check, AlertCircle, Info } from 'lucide-react'

export default function Toast({ msg }) {
  if (!msg) return null
  const isSuccess = msg.type === 'success'
  const isInfo    = msg.type === 'info'
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm ${
      isSuccess ? 'bg-green-700 text-white' : isInfo ? 'bg-stone-800 text-white' : 'bg-red-600 text-white'
    }`}>
      {isSuccess ? <Check        className="w-5 h-5 flex-shrink-0" />
        : isInfo  ? <Info         className="w-5 h-5 flex-shrink-0" />
                  : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      <span className="text-sm font-medium">{msg.text}</span>
    </div>
  )
}

// Helper: returns a notify(type, text) function bound to a setState setter
export function makeNotify(setToast) {
  return (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), type === 'success' ? 3000 : 5000)
  }
}
