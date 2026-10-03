<script lang="ts" generics="T extends string">
	import * as Select from '$lib/components/ui/select/index.js';
	import { cn } from '$lib/utils.js';

	let {
		items,
		value = $bindable(),
		class: className,
		'aria-label': ariaLabel,
		onValueChange
	}: {
		items: { value: string; label: string }[];
		value?: T;
		class?: string;
		'aria-label'?: string;
		onValueChange?: (value: T | undefined) => void;
	} = $props();
</script>

<Select.Root
	type="single"
	{items}
	bind:value={value as never}
	onValueChange={(nextValue) => onValueChange?.(nextValue as T | undefined)}
>
	<Select.Trigger class={cn('h-9', className)} aria-label={ariaLabel}>
		<Select.Value />
	</Select.Trigger>
	<Select.Content>
		<Select.Group>
			{#each items as item (item.value)}
				<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
