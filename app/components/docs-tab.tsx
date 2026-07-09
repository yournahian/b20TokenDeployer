'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Shield, Cpu, Flame, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AccordionItemProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function AccordionItem({ title, icon, children }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/5 rounded-2xl bg-[#0f1115] overflow-hidden mb-4 shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-500">{icon}</div>
          <span className="font-bold text-white text-sm md:text-base">{title}</span>
        </div>
        <div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 text-xs md:text-sm text-slate-400 border-t border-white/5 leading-relaxed space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DocsTab() {
  const [showSecurityTip, setShowSecurityTip] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-6">
        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Base B20 standard documentation
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Everything you need to know about the B20 standard, native L2 precompiles, and contract execution.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <AccordionItem
          title="What makes B20 different from standard ERC-20?"
          icon={<Cpu className="w-5 h-5" />}
        >
          <p>
            The <strong>B20 Native Token Standard</strong> is an ERC-20 superset implemented as a **Rust precompile** directly in the Base node software.
          </p>
          <p>
            Traditional ERC-20 contracts compile to Solidity bytecode which must be executed by the EVM interpreter, incurring high gas costs. In contrast, B20 precompiles:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
            <li><strong>Gas-Efficient Mints/Burns:</strong> Because B20 runs natively outside the EVM interpreter, deployments and transactions consume a fraction of the gas limits of standard Solidity.</li>
            <li><strong>Pre-audited Feature Set:</strong> Advanced features like roles, supply caps, pauses, and policy gating are baked into the protocol by the Base core development team. No custom auditing of basic compliance parameters is necessary.</li>
          </ul>
        </AccordionItem>

        <AccordionItem
          title="How does B20 Payment tagged with Memo work?"
          icon={<Flame className="w-5 h-5" />}
        >
          <p>
            A B20 token includes two payment functions that are not part of standard ERC-20:
          </p>
          <pre className="bg-[#07080a] p-3 rounded-xl text-xs text-blue-400 font-mono overflow-x-auto leading-relaxed border border-white/5">
            function transferWithMemo(address to, uint256 amount, bytes32 memo) external returns (bool);
            {"\n"}function transferFromWithMemo(address from, address to, uint256 amount, bytes32 memo) external returns (bool);
          </pre>
          <p className="mt-2">
            These functions emit a `Memo` event containing a 32-byte reference value (like an order ID, customer identifier, or transaction ticket) directly beside the `Transfer` event. Offchain indexers can read the event to instantly reconcile payments against business records without requesting a backend database lookup.
          </p>
        </AccordionItem>

        <AccordionItem
          title="Understanding B20 AccessControl Roles"
          icon={<Shield className="w-5 h-5" />}
        >
          <p>
            Unlike simple contracts that use `Ownable`, B20 uses a role-based permission system (`AccessControl`):
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-[#07080a] rounded-xl border border-white/5">
              <span className="block text-blue-400 font-bold mb-1">DEFAULT_ADMIN_ROLE (0x000...)</span>
              The ultimate administrative role. Granted automatically to the token creator. It gives the ability to grant or revoke all other roles, but does not itself allow minting.
            </div>
            <div className="p-3 bg-[#07080a] rounded-xl border border-white/5">
              <span className="block text-emerald-400 font-bold mb-1">MINT_ROLE</span>
              The permission to mint new tokens. The B20 deployer has an option to grant this role to themselves atomically during deployment, which allows them to issue supply immediately.
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Security and Verification specs on Base"
          icon={<HelpCircle className="w-5 h-5" />}
        >
          <p>
            Here are best practices for securing and launching B20 precompiles:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Basescan Verification:</strong> B20 precompiled tokens do not require verification of Solidity source code on Basescan. Because they are deployed via the singleton B20Factory precompile (`0xB20f000000000000000000000000000000000000`), block explorers automatically recognize and display their B20 compatibility and interfaces out of the box.
            </li>
            <li>
              <strong>Renouncing Control:</strong> To build trust in your project community, you can renounce the `DEFAULT_ADMIN_ROLE` to the zero address (`0x000...000`), proving that supply caps, roles, and administrative pauses can never be altered in the future.
            </li>
          </ul>
        </AccordionItem>
      </div>

      {/* Security Tip Box */}
      <div className="bg-[#0f1115] rounded-3xl p-6 border border-white/5 max-w-4xl mx-auto flex flex-col items-stretch gap-4 mt-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-white font-extrabold text-base md:text-lg">Need to connect B20 to your code?</h3>
            <p className="text-slate-400 text-xs">
              Check out our B20 MCP Server guide to see how to programmatically deploy and manage tokens from your local AI console.
            </p>
          </div>
          <button
            onClick={() => setShowSecurityTip(!showSecurityTip)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-xs cursor-pointer shadow-lg shadow-blue-500/10 shrink-0"
          >
            {showSecurityTip ? 'Hide Quick Tip' : 'Show Integration Tip'}
          </button>
        </div>

        <AnimatePresence>
          {showSecurityTip && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 p-4 bg-[#07080a] border border-white/5 rounded-xl text-xs text-slate-300 space-y-2"
            >
              <p className="font-bold text-white">Quick Integration Tip:</p>
              <p>You can query details of any B20 token natively in JavaScript using a standard `viem` public client with the `B20_ABI` defined on our specs page. This allows reading token details and memos in less than 3 lines of code.</p>
              <div className="p-3 bg-blue-600/5 border border-blue-500/15 rounded-lg text-blue-400 font-mono text-[10px]">
                {"const name = await publicClient.readContract({ address: '0xB200...', abi: B20_ABI, functionName: 'name' });"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
