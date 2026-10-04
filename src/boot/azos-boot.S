/* AZOS real-mode boot sector. BIOS loads this at 0x7c00.
 * Byte 0x1f0 is 1 when this image was installed onto the boot disk.
 * The guest writes to the QEMU debug console at port 0xe9.
 * Author: Aziel Eliab.
 */
.code16
.globl _start
_start:
  xor %ax, %ax
  mov %ax, %ds
  mov $install_flag, %bx
  cmpb $1, (%bx)
  jne .Lboot
  mov $installed, %si
  call print
.Lboot:
  mov $booted, %si
  call print
.Lhang:
  cli
  hlt
  jmp .Lhang
print:
  lodsb
  test %al, %al
  jz .Ldone
  out %al, $0xe9
  jmp print
.Ldone:
  ret
booted:
  .ascii "AZOS-BOOTED\n"
  .byte 0
installed:
  .ascii "AZOS-INSTALLED\n"
  .byte 0
.org 0x1f0
install_flag:
  .byte 0
.org 510
  .word 0xaa55
