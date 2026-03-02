import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { FormNumberInput } from '@/shared/ui/form';
import { formatCurrency } from '@/shared/utils/format';
import { calculateGroupSubtotal } from '@packages/utils';
import { cn } from '@/shared/utils/classnames';
import { UNIT_OPTIONS, DEFAULT_UNIT } from './constants';

const ITEM_GRID =
  'grid grid-cols-[16px_1fr_72px_84px_150px] gap-x-2 items-start';

export function ItemGroupEditor() {
  const { control } = useFormContext();

  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup,
    move: moveGroup,
  } = useFieldArray({ control, name: 'groups' });

  const sensors = useSensors(useSensor(PointerSensor));
  const modifiers = [restrictToVerticalAxis, restrictToParentElement];

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groupFields.findIndex(f => f.id === active.id);
    const newIndex = groupFields.findIndex(f => f.id === over.id);
    moveGroup(oldIndex, newIndex);
  }

  return (
    <div className="space-y-0">
      {groupFields.length === 0 && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          견적 항목 그룹을 추가해주세요.
        </div>
      )}

      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
        <SortableContext
          items={groupFields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {groupFields.map((groupField, groupIndex) => (
            <GroupRow
              key={groupField.id}
              id={groupField.id}
              groupIndex={groupIndex}
              onRemove={() => removeGroup(groupIndex)}
              canRemove={groupFields.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        className="flex items-center justify-center w-full py-4 border-t border-dashed text-sm text-primary hover:bg-primary/5 transition-colors cursor-pointer"
        onClick={() =>
          appendGroup({
            name: '',
            sortOrder: groupFields.length,
            items: [
              {
                name: '',
                quantity: 1,
                unit: DEFAULT_UNIT,
                amount: 0,
                sortOrder: 0,
              },
            ],
          })
        }
      >
        <Plus className="size-4 mr-1.5" />새 그룹 추가
      </button>
    </div>
  );
}

interface GroupRowProps {
  id: string;
  groupIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

function GroupRow({ id, groupIndex, onRemove, canRemove }: GroupRowProps) {
  const { control, register, watch } = useFormContext();

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    move: moveItem,
  } = useFieldArray({ control, name: `groups.${groupIndex}.items` });

  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const sensors = useSensors(useSensor(PointerSensor));
  const modifiers = [restrictToVerticalAxis, restrictToParentElement];

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemFields.findIndex(f => f.id === active.id);
    const newIndex = itemFields.findIndex(f => f.id === over.id);
    moveItem(oldIndex, newIndex);
  }

  const items = watch(`groups.${groupIndex}.items`) ?? [];
  const groupSubtotal = calculateGroupSubtotal(items);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/card border-t pt-1',
        isDragging && 'relative z-50 bg-background'
      )}
    >
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="flex justify-center py-2.5 cursor-grab active:cursor-grabbing"
      >
        <div className="w-12 h-1 rounded-full bg-muted-foreground/15 group-hover/card:bg-muted-foreground/30 transition-colors pointer-events-none" />
      </div>

      <div className="flex items-center gap-1">
        <Input
          {...register(`groups.${groupIndex}.name`)}
          placeholder="그룹명 (예: 디자인, 개발)"
          className="h-auto border-0 shadow-none focus-visible:ring-0 px-2.5 py-0.5 -mx-2.5 mr-0 rounded-md text-base md:text-base font-semibold bg-transparent dark:bg-transparent hover:bg-muted/40 transition-colors placeholder:font-normal placeholder:text-muted-foreground"
        />
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-foreground/60 hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div>
        <DndContext
          sensors={sensors}
          modifiers={modifiers}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <SortableContext
            items={itemFields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {itemFields.map((itemField, itemIndex) => (
              <ItemRow
                key={itemField.id}
                id={itemField.id}
                groupIndex={groupIndex}
                itemIndex={itemIndex}
                onRemove={() => removeItem(itemIndex)}
                canRemove={itemFields.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center justify-between pt-2 pb-4">
        <button
          type="button"
          className="flex items-center text-sm text-primary hover:text-primary transition-colors cursor-pointer pl-2 pr-5 py-1.5 -ml-2 rounded-md hover:bg-primary/5"
          onClick={() =>
            appendItem({
              name: '',
              quantity: 1,
              unit: DEFAULT_UNIT,
              amount: 0,
              sortOrder: itemFields.length,
            })
          }
        >
          <Plus className="size-3 mr-0.5" />
          항목 추가
        </button>
        {groupSubtotal > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-sm">소계</span>
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(groupSubtotal)}원
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemRowProps {
  id: string;
  groupIndex: number;
  itemIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

function ItemRow({
  id,
  groupIndex,
  itemIndex,
  onRemove,
  canRemove,
}: ItemRowProps) {
  const { control, register } = useFormContext();
  const prefix = `groups.${groupIndex}.items.${itemIndex}`;

  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/item',
        ITEM_GRID,
        'py-2',
        isDragging && 'relative z-50 bg-background shadow-md'
      )}
    >
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing h-9 flex items-center justify-center"
      >
        <GripVertical className="size-3.5 text-foreground/60" />
      </div>

      <Textarea
        {...register(`${prefix}.name`)}
        placeholder="항목명"
        compact
        rows={1}
        className="resize-none"
      />
      <FormNumberInput
        control={control}
        name={`${prefix}.quantity`}
        allowDecimal
        placeholder="0"
      />
      <NativeSelect {...register(`${prefix}.unit`)}>
        {UNIT_OPTIONS.map(u => (
          <NativeSelectOption key={u} value={u}>
            {u}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="flex items-center gap-1">
        <FormNumberInput
          control={control}
          name={`${prefix}.amount`}
          suffix="원"
          thousandSeparator
          placeholder="0"
        />
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-foreground/60 hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
