---
name: screen-reader
description: A skill that helps developers check the screen reader accessibility of their apps by analyzing the accessibility tree and providing feedback on potential issues.
---

# Get the accessibility tree

Get the accessibility tree from the user's connected device using the MCP tools:

- For **Android**: call `get_accessibility_tree_android` (optionally pass a `deviceId`).
- For **iOS**: call `get_accessibility_tree_ios` (optionally pass an `appId` and `wdaPort`). WebDriverAgent must already be running on the simulator.

# Then, analyze the code referencing the accessibility tree

## 1. Identify the first component

Start at the top left of the screen, and identify the first component. If it has multiple interactive elements, split them into separate components.

Example:

```jsx
<HStack>
  <Text style={styles.header}>Customers</Text>
  <Pressable>
    <Icon name="plus" />
  </Pressable>
</HStack>
```

This is likely 2 components: a header and a button Take special attention to interactive elements inside other interactive elements. This will require a refactor to remove the nesting first while keeping the UX

## 2. Determine the type of component

included but not limited to:

- adjustable: Used when an element can be "adjusted" (e.g. a slider, handles for bottom sheets).
- alert (Android only): Used when an element contains important text to be presented to the user.
- button: Used when the element should be treated as a button.
- checkbox: Used when an element represents a checkbox that can be checked, unchecked, or have a mixed checked state.
- combobox (Android only): Used when an element represents a combo box, which allows the user to select among several choices.
- header: Used when an element acts as a header for a content section (e.g. the title of a navigation bar).
- image: Used when the element should be treated as an image. Can be combined with a button or link.
- imagebutton: Used when the element should be treated as a button and is also an image.
- keyboardkey (iOS only): Used when the element acts as a keyboard key.
- link: Used when the element should be treated as a link.
- menu (Android only): Used when the component is a menu of choices.
- menubar (Android only): Used when a component is a container of multiple menus.
- menuitem (Android only): Used to represent an item within a menu.
- progressbar: Used to represent a component that indicates the progress of a task.
- radio: Used to represent a radio button. This needs a accessibilityState.
- radiogroup: Used to represent a group of radio buttons.
- scrollbar (Android only): Used to represent a scroll bar.
- search (iOS only): Used when a text field element should also be treated as a search field.
- spinbutton (Android only): Used to represent a button that opens a list of choices.
- summary: Used when an element can be used to provide a quick summary of current conditions in the app when the app first launches.
- switch: Used to represent a switch that can be turned on and off.
- tab (Android only): Used to represent a tab.
- tablist (Android only): Used to represent a list of tabs.
- text: Used when the element should be treated as static text that cannot change.
- timer (iOS): Used to represent a timer.
- togglebutton: Used to represent a toggle button. Should be used with accessibilityState checked to indicate if the button is toggled on or off.
- toolbar (Android only): Used to represent a toolbar (a container of action buttons or components).

## 3. Does it need a role?

- Skip for TextInputs or Tab Navigation.
- Otherwise, add the atpropriate role directly on the component (e.g., header role on the Text component, button role on Pressable).

Example:

```jsx
<HStack>
  <Text style={styles.header} accessibilityRole="header">
    Customers
  </Text>
  <Pressable accessibilityRole="button">
    <Icon name="plus" />
  </Pressable>
</HStack>
```

## 4. Does it have state?

- If the element can be disabled, selected, checked, busy, or expanded, add `accessibilityState`.
- Note: on iOS if a components has accessibilityStates={{expanded: false}}, the device does not provide the state collapsed, and the hint should be adjusted accordiningly

Examples

```jsx
<TouchableOpacity
  accessibilityStates={{ disabled: isDisabled }}
  disabled={isDisabled}
  style={{ backgroundColor: "#ccc", padding: 12, borderRadius: 8 }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

```jsx
<TouchableOpacity accessibilityStates={{ selected }} style={{ padding: 12 }}>
  <Text>Home</Text>
</TouchableOpacity>
```

```jsx
<View
  accessibilityLabel="Loading profile data"
  accessibilityStates={{ busy }}
  style={{ padding: 12 }}
>
  <ActivityIndicator size="large" />
</View>
```

```jsx
<TouchableOpacity
  accessibilityRole="checkbox"
  accessibilityState={{ checked }}
  onPress={() => setChecked(!checked)}
  style={{
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  }}
>
  <Icon
    name={checked ? "checkbox-checked" : "checkbox"}
    size={24}
    color={checked ? "#333" : "#999"}
    style={{ marginRight: 8 }}
  />
  <Text>Email Notifications</Text>
</TouchableOpacity>
```

```jsx
<View style={{ padding: 12 }}>
  <Pressable
    onPress={() => setExpanded(!expanded)}
    accessibilityRole="button"
    accessibilityState={{ expanded }}
    accessibilityHint={
      expanded
        ? "Double tab to collapse details"
        : "Double tap to expand details"
    }
    hitSlop={8}
    style={{ flexDirection: "row", alignItems: "center" }}
  >
    <Icon
      name={expanded ? "chevron-up" : "chevron-down"}
      size={22}
      style={{ marginRight: 6 }}
    />
    <Text style={{ fontWeight: "600" }}>
      {expanded ? "Hide details" : "Show details"}
    </Text>
  </Pressable>

  <View
    accessible
    importantForAccessibility={expanded ? "yes" : "no-hide-descendants"}
    style={{ marginTop: expanded ? 8 : 0 }}
  >
    {expanded && (
      <Text style={{ lineHeight: 20 }}>
        This section contains additional info about your order.
      </Text>
    )}
  </View>
</View>
```

## 5. Does it contain non-text items?

- If purely decorative → set importantForAccessibility="no" and accessibilityElementsHidden={true}. You can also set accessible={false} on individual elements, but never use it on elements that wrap other components.
- If not decorative → add accessibilityLabel or accessibilityHint.
- Example: For a coupon code with a copy icon → label the code, and use a hint like "double tap to copy"

## 6. Does it need to be grouped?

- Use accessible={true} on the wrapping View to group elements (e.g., for table rows).

<View accessible={true}>
  <Text>{label}</Text>
  <Text>{value}</Text>
</View>

## 7. Is it obvious what the element does?

- If not, and the element is an interactive element (button, radio, checkbox, switch...) add accessibilityHint.
  Examples:
  ❌ Over-hinted (BAD):

<Pressable
accessibilityRole="button"
accessibilityLabel="Save"
accessibilityHint="Double tap to save" // Redundant!

> ✅ No hint needed (GOOD):

<Pressable
accessibilityRole="button"
accessibilityLabel="Save"

>

<Pressable
accessibilityRole="button"
accessibilityLabel="PROMO2024"
accessibilityHint="Double tap to copy code to clipboard"

>

Still To Add details around

- Test with screen readers and consider zIndex order.
