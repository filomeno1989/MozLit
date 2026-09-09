'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { PAISES, type Pais } from '@/lib/paises';
import { ChevronsUpDown, Check, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryCodePickerProps {
  value: Pais;
  onChange: (p: Pais) => void;
}

/**
 * Seletor de código de país pesquisável (todos os países, busca por nome ou código).
 * Ex: "Moçambique +258", "Portugal +351".
 */
export default function CountryCodePicker({ value, onChange }: CountryCodePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Escolher código do país"
          className="w-[7.75rem] justify-between shrink-0 font-normal px-2.5"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{value.dial}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar país ou código..." />
          <CommandList className="max-h-64">
            <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
            <CommandGroup>
              {PAISES.map((p) => (
                <CommandItem
                  key={p.codigo}
                  value={`${p.nome} ${p.dial} ${p.codigo}`}
                  onSelect={() => {
                    onChange(p);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', p.codigo === value.codigo ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{p.nome}</span>
                  <span className="text-muted-foreground font-mono text-xs shrink-0">{p.dial}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
