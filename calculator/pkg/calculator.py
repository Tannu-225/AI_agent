class Calculator:
    def __init__(self, initial_value=0):
        # Intentional bug: using wrong attribute name in multiply/add later
        self.current_val = initial_value
    
    def add(self, num):
        # Intentional bug: referencing non-existent attribute 'value'
        self.value += num
        return self
        
    def subtract(self, num):
        self.current_val -= num
        return self
        
    def multiply(self, num):
        self.current_val *= num
        return self
        
    def divide(self, num):
        if num == 0:
            raise ValueError("Cannot divide by zero")
        self.current_val /= num
        return self

    def clear(self):
        self.current_val = 0
        return self
