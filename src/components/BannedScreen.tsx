import { motion } from 'framer-motion';
import { BanIcon } from './Icons';

type BannedScreenProps = {
  reason?: string;
};

export default function BannedScreen({ reason }: BannedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-500/20 p-4">
              <BanIcon size={48} className="text-red-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-red-400 mb-4">Account Bannato</h1>
          
          <p className="text-slate-300 mb-6">
            Il tuo account è stato bannato per violazione delle regole della community.
          </p>
          
          {reason && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 mb-6">
              <p className="text-sm text-red-300">
                <span className="font-semibold">Motivo:</span> {reason}
              </p>
            </div>
          )}
          
          <div className="space-y-2 text-xs text-slate-400">
            <p>Se pensi che sia un errore, contatta un amministratore.</p>
            <p>Per assistenza, scrivi a support@underground.app</p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-red-500/20">
            <p className="text-xs text-slate-500">
              UnderGround Community • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
