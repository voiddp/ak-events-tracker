import { Stack } from '@mui/material';
import { SnackbarContent, CustomContentProps } from 'notistack'
import { forwardRef } from 'react';

interface ItemsProps extends CustomContentProps {
    items: React.ReactNode,
}

const ItemsSnackBar = forwardRef<HTMLDivElement, ItemsProps>((props, ref) => {
    const {
        id,
        message,
        items,
        ...other
    } = props

    return (
        <SnackbarContent ref={ref} role="success" {...other}>
            <Stack direction="row"
                alignItems="center"
                ml={2}
                p={2}
                style={{
                    backgroundColor: "green",
                    borderRadius: "5px",
                }}>
                Krooster simulation: to Depot: + {items}
            </Stack>
        </SnackbarContent>
    )
})

export default ItemsSnackBar;

ItemsSnackBar.displayName = "ItemsSnackBar";