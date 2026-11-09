import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { TournamentCostInsert, TournamentCostRow } from '@/repository/TournamentCostRepository';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const FIXED_CATEGORIES = [
  'transportation',
  'fee',
  'food',
  'accommodation',
  'equipment',
  'other',
] as const;

export type AddEditCostPayload = {
  entry?: TournamentCostRow;
  existingTournaments?: string[];
  onSave: (data: TournamentCostInsert) => void;
  onDelete?: () => void;
};

const today = () => new Date().toISOString().split('T')[0];

const AddEditCostDialog = ({ open, onClose, payload }: DialogProps<AddEditCostPayload, void>) => {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const { entry, existingTournaments, onSave, onDelete } = payload;

  const isEdit = !!entry;

  const [tournament, setTournament] = useState(entry?.tournament ?? '');
  const [date, setDate] = useState(() => entry?.date ?? today());
  const [category, setCategory] = useState(
    entry ? (FIXED_CATEGORIES.includes(entry.category as never) ? entry.category : 'other') : 'transportation'
  );
  const [customCategory, setCustomCategory] = useState(
    entry && !FIXED_CATEGORIES.includes(entry.category as never) ? entry.category : ''
  );
  const [description, setDescription] = useState(entry?.description ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');

  const resolvedCategory = category === 'other' && customCategory.trim()
    ? customCategory.trim()
    : category;

  const canSave =
    tournament.trim() !== '' &&
    date !== '' &&
    resolvedCategory !== '' &&
    amount !== '' &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) >= 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      tournament: tournament.trim(),
      date,
      category: resolvedCategory,
      description: description.trim() || null,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
    });
    onClose(null);
  };

  const handleDelete = async () => {
    const confirmed = await dialogs.confirm(t('costs.deleteConfirm'));
    if (confirmed) {
      onDelete?.();
      onClose(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('costs.editEntry') : t('costs.addEntry')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-4 pb-2">
          <Field>
            <FieldLabel>{t('costs.tournament')}</FieldLabel>
            <Input
              value={tournament}
              onChange={(e) => setTournament(e.target.value)}
              placeholder={t('costs.tournament')}
              list="cost-tournament-list"
            />
            {existingTournaments && existingTournaments.length > 0 && (
              <datalist id="cost-tournament-list">
                {existingTournaments.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
          </Field>

          <Field>
            <FieldLabel>{t('costs.date')}</FieldLabel>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>{t('costs.category')}</FieldLabel>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIXED_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`costs.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {category === 'other' && (
            <Field>
              <FieldLabel>{t('costs.customCategory')}</FieldLabel>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('costs.customCategoryPlaceholder')}
              />
            </Field>
          )}

          <Field>
            <FieldLabel>{t('costs.description')}</FieldLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('costs.descriptionPlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel>{t('costs.amount')}</FieldLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <DialogFooter className="px-4 pb-4 gap-2">
          {isEdit && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              {t('common.delete')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onClose(null)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditCostDialog;
